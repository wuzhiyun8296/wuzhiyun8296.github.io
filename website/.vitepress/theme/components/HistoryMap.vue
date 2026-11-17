<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const db = ref({ grid: { cols: 400, rows: 225 }, epochs: [], states: [], sites: [], events: [] })
const epochIndex = ref(0)
const canvasEl = ref(null)
const loaded = ref(false)
let bgImage = null   // 世界地图那张底图

const epochsSorted = computed(() => [...db.value.epochs].sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0)))
const currentEpoch = computed(() => epochsSorted.value[epochIndex.value] || null)

const stateById = (id) => db.value.states.find(s => s.id === id)

/** 当前纪元下，每个据点归属哪个势力（回放事件） */
const owners = computed(() => {
  const cur = currentEpoch.value
  const curOrd = cur ? (cur.ordinal || 0) : 0
  const map = {}
  db.value.sites.forEach(s => { map[s.id] = s.owner || '' })
  const ordered = db.value.events.map((ev, i) => {
    const ep = db.value.epochs.find(e => e.id === ev.epochId)
    return { ev, ord: ep ? (ep.ordinal || 0) : 0, i }
  }).sort((a, b) => a.ord - b.ord || a.i - b.i)
  for (const { ev, ord } of ordered) {
    if (ord > curOrd) break
    ;(ev.siteChanges || []).forEach(ch => { map[ch.siteId] = ch.to })
  }
  return map
})

/** 当前纪元发生的事件 */
const epochEvents = computed(() => {
  if (!currentEpoch.value) return []
  return db.value.events.filter(ev => ev.epochId === currentEpoch.value.id)
})

const hexRgb = (hex) => {
  const s = String(hex || '#888').replace('#', '')
  const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s.padEnd(6, '0')
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0]
}

// 还原行游程（必须整段连续还原，按行切分会丢掉跨行的那一段）
const decodeRuns = (runs, cols, rows) => {
  const out = new Int16Array(cols * rows).fill(-1)
  let i = 0, pos = 0
  while (i + 1 < runs.length && pos < out.length) {
    const len = runs[i], val = runs[i + 1]
    i += 2
    for (let k = 0; k < len && pos < out.length; k++) out[pos++] = val
  }
  return out
}

const draw = () => {
  const cv = canvasEl.value
  if (!cv) return
  const { cols, rows } = db.value.grid
  const W = cv.width, H = cv.height
  const ctx = cv.getContext('2d')

  const si = {}
  db.value.states.forEach((s, i) => { si[s.id] = i })

  // 有底版就用地图上的真实国界（和后台一致），事件只做局部改动
  const base = db.value.baseline
  let cellOwner = null
  if (base && base.cols === cols && base.rows === rows && Array.isArray(base.rle)) {
    cellOwner = decodeRuns(base.rle, cols, rows)
    const ordered = db.value.events.map((ev, i) => {
      const ep = db.value.epochs.find(e => e.id === ev.epochId)
      return { ev, ord: ep ? (ep.ordinal || 0) : 0, i }
    }).sort((a, b) => a.ord - b.ord || a.i - b.i)
    const curOrd = currentEpoch.value ? (currentEpoch.value.ordinal || 0) : 0
    for (const { ev, ord } of ordered) {
      if (ord > curOrd) break
      ;(ev.siteChanges || []).forEach(ch => {
        const fromIdx = si[ch.from], toIdx = si[ch.to]
        const site = db.value.sites.find(s => s.id === ch.siteId)
        if (!site || fromIdx === undefined || toIdx === undefined) return
        for (let p = 0; p < cellOwner.length; p++) {
          if (cellOwner[p] !== fromIdx) continue
          const x = p % cols, y = Math.floor(p / cols)
          let bestId = null, bestD = Infinity
          for (const s2 of db.value.sites) {
            const d = (s2.x - x) * (s2.x - x) + (s2.y - y) * (s2.y - y) * 2.2
            if (d < bestD) { bestD = d; bestId = s2.id }
          }
          if (bestId === ch.siteId) cellOwner[p] = toIdx
        }
      })
    }
  }

  // 没有底版时退回「按据点就近划分」
  const ownersMap = owners.value
  const seeds = db.value.sites
    .filter(s => ownersMap[s.id] && si[ownersMap[s.id]] !== undefined)
    .map(s => ({ x: s.x, y: s.y, idx: si[ownersMap[s.id]] }))

  const cell = document.createElement('canvas')
  cell.width = cols; cell.height = rows
  const cc = cell.getContext('2d')
  const img = cc.createImageData(cols, rows)
  const data = img.data
  const rgb = db.value.states.map(s => hexRgb(s.color))
  const hasBg = !!(bgImage && bgImage.complete && bgImage.naturalWidth)

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let best = -1
      if (cellOwner) {
        best = cellOwner[y * cols + x]
      } else {
        let bestD = Infinity
        for (let k = 0; k < seeds.length; k++) {
          const dx = x - seeds[k].x, dy = (y - seeds[k].y) * 1.8
          const d = dx * dx + dy * dy
          if (d < bestD) { bestD = d; best = seeds[k].idx }
        }
      }
      const o = (y * cols + x) * 4
      if (best >= 0 && rgb[best]) {
        const c = rgb[best]
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]
        // 有底图时半透明叠加，让地形透出来；没底图就实色
        data[o + 3] = hasBg ? 105 : 235
      } else {
        data[o + 3] = 0
      }
    }
  }
  cc.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, W, H)

  // ① 底图（和后台是同一张）
  if (hasBg) {
    ctx.drawImage(bgImage, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#0d1b26'
    ctx.fillRect(0, 0, W, H)
  }
  // ② 版图色块
  ctx.drawImage(cell, 0, 0, W, H)

  // 国名：按领土重心标注
  const acc = []
  for (let i = 0; i < cols * rows; i++) {
    const s = cellOwner ? cellOwner[i] : -1
    const si = s >= 0 ? s : (() => {
      // 没有底版时按最近据点判断
      const x = i % cols, y = Math.floor(i / cols)
      let best = -1, bestD = Infinity
      for (let k = 0; k < seeds.length; k++) {
        const dx = x - seeds[k].x, dy = (y - seeds[k].y) * 1.8
        const d = dx * dx + dy * dy
        if (d < bestD) { bestD = d; best = seeds[k].idx }
      }
      return best
    })()
    if (si < 0) continue
    const a = acc[si] || (acc[si] = { sx: 0, sy: 0, n: 0 })
    a.sx += i % cols; a.sy += Math.floor(i / cols); a.n++
  }
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  acc.forEach((a, si) => {
    if (!a || a.n < 150) return
    const st = db.value.states[si]
    if (!st) return
    const cx = (a.sx / a.n) * (W / cols)
    const cy = (a.sy / a.n) * (H / rows)
    const size = Math.max(20, Math.min(40, Math.sqrt(a.n) * 1.5))
    ctx.font = `bold ${Math.round(size)}px "Microsoft YaHei", sans-serif`
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(0,0,0,.7)'
    ctx.strokeText(st.name, cx, cy)
    ctx.fillStyle = 'rgba(255,255,255,.96)'
    ctx.fillText(st.name, cx, cy)
  })
  ctx.restore()

  const sx = W / cols, sy = H / rows
  db.value.sites.forEach(site => {
    const st = stateById(ownersMap[site.id])
    ctx.beginPath()
    ctx.arc(site.x * sx, site.y * sy, 6, 0, Math.PI * 2)
    ctx.fillStyle = st ? st.color : '#888'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(0,0,0,.75)'
    ctx.stroke()
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(0,0,0,.8)'
    ctx.strokeText(site.name, site.x * sx, site.y * sy - 14)
    ctx.fillStyle = '#fff'
    ctx.fillText(site.name, site.x * sx, site.y * sy - 14)
  })
}

onMounted(async () => {
  try {
    const res = await fetch('/history.json?t=' + Date.now())
    if (res.ok) {
      const data = await res.json()
      if (data && data.epochs) db.value = data
    }
  } catch (e) { /* 静默：前台只做展示 */ }

  // 底图：和后台同一个文件名，有就叠在版图下面
  try {
    const mr = await fetch('/map.json?t=' + Date.now())
    if (mr.ok) {
      const md = await mr.json()
      if (md && md.image) {
        const im = new Image()
        im.onload = () => { bgImage = im; draw() }
        im.src = md.image
      }
    }
  } catch (e) { /* 忽略 */ }

  loaded.value = true
  epochIndex.value = Math.max(0, epochsSorted.value.length - 1)
  // ⚠️ canvas 要等 Vue 渲染完才存在，这里必须等一个 tick
  await nextTick()
  draw()
})

watch(epochIndex, () => draw())
</script>

<template>
  <div class="hist-wrap">
    <div v-if="!loaded" class="hist-empty">加载中…</div>
    <template v-else-if="!epochsSorted.length">
      <div class="hist-empty">还没有历史数据，先在后台「历史模拟」插件里建立纪元与势力。</div>
    </template>
    <template v-else>
      <div class="hist-bar">
        <span class="hist-era">{{ currentEpoch?.name }}</span>
        <span class="hist-date">{{ currentEpoch?.start }} — {{ currentEpoch?.end }}</span>
        <input class="hist-slider" type="range" min="0" :max="Math.max(0, epochsSorted.length - 1)" v-model.number="epochIndex" />
      </div>
      <div class="hist-main">
        <canvas ref="canvasEl" width="1600" height="900" class="hist-canvas"></canvas>
      </div>
      <div class="hist-legend">
        <span v-for="st in db.states" :key="st.id" class="hist-li">
          <i :style="{ background: st.color }"></i>{{ st.name }}
        </span>
      </div>
      <div v-if="epochEvents.length" class="hist-events">
        <div class="hist-ev" v-for="ev in epochEvents" :key="ev.id">
          <b>{{ ev.date }}</b> {{ ev.title }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hist-wrap { display: flex; flex-direction: column; gap: 14px; }
.hist-empty { padding: 40px; text-align: center; color: var(--vp-c-text-3); }
.hist-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.hist-era { font-weight: bold; font-size: 17px; color: var(--vp-c-text-1); }
.hist-date { font-size: 13px; color: var(--vp-c-text-3); }
.hist-slider { flex: 1; min-width: 200px; accent-color: #0e639c; }
.hist-main { border: 1px solid var(--vp-c-divider); border-radius: 10px; overflow: hidden; background: #0d1b26; }
.hist-canvas { width: 100%; height: auto; display: block; }
.hist-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }
.hist-li { display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-text-2); }
.hist-li i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.hist-events { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.hist-ev { padding-left: 10px; border-left: 2px solid #0e639c; }
</style>
