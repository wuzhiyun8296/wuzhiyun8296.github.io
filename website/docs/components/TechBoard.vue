<!-- 文件路径: website/docs/components/TechBoard.vue -->
<!-- 前台科技树：只读展示用户当前走的线、已完成的项目与完成时间 -->
<template>
  <div v-if="ready">
    <!-- 🌱 还没建世界 -->
    <div class="tb-noworld" v-if="!hasRealWorld">
      <div class="tb-nw-emoji">🌱</div>
      <div class="tb-nw-title">还没有创建世界哦～</div>
      <div class="tb-nw-text">
        科技树是跟着「世界」走的：一本书（或一个设定世界）一套进度。<br>
        先去后台给它起个名字，这里就会长出你的科技树。
      </div>
      <div class="tb-nw-hint">在后台「科技树」里点「＋ 新建世界」就可以开始啦。</div>
    </div>

    <template v-else>
    <!-- 🌐 世界选择 -->
    <div class="tb-worlds" v-if="worlds.length">
      <span class="tb-worlds-label">🌐 世界</span>
      <button
        class="tb-world"
        v-for="w in worlds" :key="w.id"
        :class="{ on: w.id === worldId }"
        @click="pickWorld(w.id)"
      >
        {{ w.name }}
        <i v-if="w.books && w.books.length">{{ w.books.join(' · ') }}</i>
      </button>
    </div>

    <!-- 顶部：当前路线 -->
    <div class="tb-head">
      <div class="tb-head-left">
        <span class="tb-icon">{{ currentRoute ? currentRoute.themeIcon : '🌳' }}</span>
        <div>
          <div class="tb-title">
            {{ currentRoute ? currentRoute.themeName + ' · ' + routeLabel : '还没有选路线' }}
          </div>
          <div class="tb-sub" v-if="currentRoute">
            {{ currentRoute.eras.length }} 个时代 · 已完成 {{ currentDone }} / {{ currentTotal }}
          </div>
          <div class="tb-sub" v-else>在后台「科技树」里选一条线，这里就会显示</div>
        </div>
      </div>
      <div class="tb-pct">
        <div class="tb-pct-num">{{ currentPercent }}<span>%</span></div>
        <div class="tb-pct-bar"><div :style="{ width: currentPercent + '%' }"></div></div>
      </div>
    </div>

    <div class="tb-warn" v-if="currentRoute && currentRoute.traveler">
      ⚠️ 这条线是穿越者发展：结合当时环境，小心被发现哦。
    </div>

    <!-- 时间线（可折叠，最新的在最上面） -->
    <details class="tb-fold">
      <summary class="tb-section-title">
        🕒 完成时间线
        <span class="tb-count" v-if="timeline.length">{{ timeline.length }}</span>
        <span class="tb-fold-hint">最新在上</span>
      </summary>

      <div class="tb-empty" v-if="!timeline.length">
        还没有完成任何科技。到后台「科技树」里点开一个节点，点「✓ 标记已掌握」并填上时间，这里就会按时间排出来。
      </div>
      <div class="tb-timeline" v-else>
        <div class="tb-line" v-for="item in timeline" :key="item.id">
          <div class="tb-dot"></div>
          <div class="tb-time">{{ item.at || '（未填时间）' }}</div>
          <div class="tb-node">
            <span class="tb-node-icon">{{ item.icon }}</span>
            <span class="tb-node-name">{{ item.name }}</span>
            <span class="tb-node-era">{{ item.eraName }}</span>
          </div>
        </div>
      </div>
    </details>

    <!-- 各时代进度 -->
    <div class="tb-section-title">🌳 当前路线的进度</div>
    <div class="tb-eras" v-if="currentRoute">
      <div class="tb-era" v-for="e in erasMerged" :key="e.id">
        <div class="tb-era-head">
          <span class="tb-era-name">{{ e.icon }} {{ e.name }}</span>
          <span class="tb-era-num">{{ eraDone(e) }} / {{ e.nodes.length }}</span>
        </div>
        <div class="tb-era-bar"><div :style="{ width: eraPercent(e) + '%' }"></div></div>
        <div class="tb-chips">
          <span class="tb-chip" :class="{ done: isDone(n.id) }" v-for="n in e.nodes" :key="n.id">
            <template v-if="isDone(n.id)">✓ {{ n.icon }} {{ n.name }}<i v-if="timeOf(n.id)"> · {{ timeOf(n.id) }}</i></template>
            <template v-else>{{ n.icon }} {{ n.name }}</template>
          </span>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = (typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname))
  ? 'http://localhost:3001/api'
  : '/api'

const ready = ref(false)
const catalog = ref({ routes: [] })
const progress = ref({})
const routeLabel = computed(() => {
  if (activeRoutes.value.length > 1) return '标准 + 穿越者 并行'
  const r = currentRoute.value
  if (!r) return ''
  return r.variant === 'traveler' ? '穿越者发展' : '标准发展'
})
const picked = ref('')
const pickedIds = ref([])   // 可以并行多条

const routes = computed(() => catalog.value.routes || [])
// 选中的路线（可能多条：标准 + 穿越者）
const activeRoutes = computed(() => {
  const ids = pickedIds.value.length ? pickedIds.value : (picked.value ? [picked.value] : [])
  return ids.map((id) => routes.value.find((r) => r.id === id)).filter(Boolean)
})
const currentRoute = computed(() => activeRoutes.value[0] || null)
// 并行时把多条线的时代合并（按 id 去重）
const erasMerged = computed(() => {
  const byId = new Map()
  const order = []
  activeRoutes.value.forEach((r) => {
    r.eras.forEach((era) => {
      if (!byId.has(era.id)) {
        byId.set(era.id, { ...era, nodes: [...era.nodes] })
        order.push(era.id)
      } else {
        const cur = byId.get(era.id)
        const seen = new Set(cur.nodes.map((n) => n.id))
        era.nodes.forEach((n) => { if (!seen.has(n.id)) cur.nodes.push(n) })
      }
    })
  })
  return order.map((id) => byId.get(id))
})

const isDone = (id) => !!progress.value[id]
const timeOf = (id) => {
  const v = progress.value[id]
  return v && typeof v === 'object' ? v.at || '' : ''
}
const doneAtOf = (id) => {
  const v = progress.value[id]
  return v && typeof v === 'object' ? v.doneAt || '' : ''
}

const nodesOf = (r) => (r ? r.eras.flatMap((e) => e.nodes) : [])
const mergedNodes = computed(() => erasMerged.value.flatMap((e) => e.nodes))
const currentTotal = computed(() => mergedNodes.value.length)
const currentDone = computed(() => mergedNodes.value.filter((n) => isDone(n.id)).length)
const currentPercent = computed(() => (currentTotal.value ? Math.round((currentDone.value / currentTotal.value) * 100) : 0))

const eraDone = (e) => e.nodes.filter((n) => isDone(n.id)).length
const eraPercent = (e) => (e.nodes.length ? Math.round((eraDone(e) / e.nodes.length) * 100) : 0)

// 完成时间线：优先按填的时间（字符串）排，没有时间的排后面
const timeline = computed(() => {
  const list = []
  const seen = new Set()   // 同一条科技可能在多条线里出现（共享节点），只显示一次
  routes.value.forEach((r) => {
    r.eras.forEach((e) => {
      e.nodes.forEach((n) => {
        if (!isDone(n.id) || seen.has(n.id)) return
        seen.add(n.id)
        list.push({
          id: r.id + '_' + n.id,
          name: n.name,
          icon: n.icon,
          eraName: e.name,
          at: timeOf(n.id),
          doneAt: doneAtOf(n.id)
        })
      })
    })
  })
  // 倒序：最近标记的排最上面（用真实时间 doneAt，填的世界时间只用于显示）
  return list.sort((a, b) => {
    const ta = a.doneAt || ''
    const tb = b.doneAt || ''
    if (ta && tb) return tb.localeCompare(ta)
    if (ta) return -1
    if (tb) return 1
    return 0
  })
})

const worlds = ref([])
const worldId = ref('')
// 除了自动生成的「默认世界」，还有没有用户自己建的世界
const hasRealWorld = computed(() => {
  const list = worlds.value || []
  if (!list.length) return false
  const custom = list.filter((w) => w.id !== 'default')
  if (custom.length) return true
  const def = list.find((w) => w.id === 'default')
  return !!(def && (def.books || []).length) || Object.keys(progress.value || {}).length > 0
})

const loadForWorld = async (id) => {
  const q = 'world=' + encodeURIComponent(id || '')
  const [p, d] = await Promise.all([
    fetch(`${API}/tech/progress?${q}&t=${Date.now()}`).then((r) => r.json()),
    fetch(`${API}/tech/data?${q}&t=${Date.now()}`).then((r) => r.json())
  ])
  progress.value = (p && p.progress) || {}
  picked.value = (d && d.routeId) || ''
  pickedIds.value = (d && Array.isArray(d.routeIds) && d.routeIds.length) ? d.routeIds : (d && d.routeId ? [d.routeId] : [])
  worldId.value = (d && d.world) || id
}

const pickWorld = async (id) => {
  worldId.value = id
  try { await loadForWorld(id) } catch (e) {}
}

onMounted(async () => {
  try {
    const [c, w] = await Promise.all([
      fetch(`${API}/tech/catalog?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API}/tech/worlds?t=${Date.now()}`).then((r) => r.json())
    ])
    catalog.value = c || { routes: [] }
    worlds.value = (w && w.worlds) || []
    await loadForWorld((w && w.current) || '')
  } catch (e) {
    // 后台没开：显示空态，不报错
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.tb-head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #1e2126; border: 1px solid #2c3138; border-radius: 12px;
  padding: 16px 18px; margin: 20px 0 14px;
}
.tb-head-left { display: flex; align-items: center; gap: 12px; }
.tb-icon {
  width: 40px; height: 40px; border-radius: 10px; background: #14171b;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.tb-title { font-size: 14.5px; color: #fff; font-weight: 600; }
.tb-sub { font-size: 12px; color: #7d848e; margin-top: 3px; }
.tb-pct { text-align: right; min-width: 90px; }
.tb-pct-num { font-size: 22px; color: #7fc4ee; font-weight: 600; }
.tb-pct-num span { font-size: 12px; color: #6f7681; }
.tb-pct-bar { height: 5px; width: 90px; background: #14171b; border-radius: 99px; overflow: hidden; margin-top: 5px; }
.tb-pct-bar > div { height: 100%; background: linear-gradient(90deg,#2f9cde,#1d6fa5); }

.tb-warn {
  font-size: 12px; color: #f0d08a; background: rgba(210,153,34,.10);
  border: 1px solid rgba(210,153,34,.35); border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;
}

.tb-section-title { font-size: 13px; color: #c5ccd4; font-weight: 600; margin: 26px 0 12px; }
.tb-empty { font-size: 12.5px; color: #6f7681; line-height: 1.9; }

.tb-timeline { position: relative; padding-left: 6px; }
.tb-line { display: flex; align-items: flex-start; gap: 12px; padding: 7px 0; position: relative; }
.tb-line::before {
  content: ''; position: absolute; left: 4px; top: 18px; bottom: -7px; width: 1px; background: #2c3138;
}
.tb-line:last-child::before { display: none; }
.tb-dot {
  width: 9px; height: 9px; border-radius: 50%; background: #2ea043; margin-top: 5px; flex: 0 0 9px;
  box-shadow: 0 0 0 3px rgba(46,160,67,.15);
}
.tb-time { flex: 0 0 130px; font-size: 12px; color: #7fc4ee; }
.tb-node { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.tb-node-name { font-size: 12.5px; color: #d5dae1; }
.tb-node-era { font-size: 11px; color: #6f7681; border: 1px solid #343a42; border-radius: 999px; padding: 1px 7px; }

.tb-eras { display: grid; gap: 12px; }
.tb-era { background: #1a1d22; border: 1px solid #262b31; border-radius: 10px; padding: 12px 14px; }
.tb-era-head { display: flex; justify-content: space-between; font-size: 12.5px; color: #c5ccd4; }
.tb-era-num { color: #6f7681; }
.tb-era-bar { height: 4px; background: #14171b; border-radius: 99px; overflow: hidden; margin: 8px 0 10px; }
.tb-era-bar > div { height: 100%; background: #2ea043; }
.tb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tb-chip {
  font-size: 11.5px; color: #7d848e; border: 1px solid #343a42; border-radius: 999px; padding: 3px 9px;
}
.tb-chip.done { color: #8fd6a3; border-color: rgba(46,160,67,.4); background: rgba(46,160,67,.10); }
.tb-chip i { font-style: normal; color: #7fc4ee; }

@media (max-width: 640px) {
  .tb-head { flex-direction: column; align-items: flex-start; }
  .tb-pct { text-align: left; }
  .tb-time { flex: 0 0 auto; }
}

.tb-fold { margin: 26px 0 0; }
.tb-fold > summary {
  cursor: pointer; list-style: none; display: flex; align-items: center; gap: 8px;
  margin: 0 0 12px; user-select: none;
}
.tb-fold > summary::-webkit-details-marker { display: none; }
.tb-fold > summary::before {
  content: '▸'; color: #6f7681; font-size: 11px; transition: transform .15s;
}
.tb-fold[open] > summary::before { transform: rotate(90deg); }
.tb-fold .tb-count {
  font-size: 11px; color: #7fc4ee; border: 1px solid #2f6f9e;
  background: rgba(14,99,156,.15); border-radius: 999px; padding: 0 7px; line-height: 1.7;
}
.tb-fold-hint { font-size: 11px; color: #5f6772; font-weight: 400; margin-left: auto; }

.tb-worlds {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 20px 0 0;
}
.tb-worlds-label { font-size: 12px; color: #6f7681; }
.tb-world {
  border: 1px solid #343a42; background: #1e2126; color: #9aa1ab;
  border-radius: 999px; padding: 6px 13px; font-size: 12.5px; cursor: pointer;
  display: flex; align-items: center; gap: 7px;
}
.tb-world:hover { border-color: #4a525c; color: #d5dae1; }
.tb-world.on { border-color: #0e639c; background: rgba(14,99,156,.18); color: #cfe6f7; }
.tb-world i { font-style: normal; font-size: 10.5px; color: #6f7681; }
.tb-world.on i { color: #7fc4ee; }

.tb-noworld {
  margin: 28px 0; padding: 34px 24px; text-align: center;
  background: #1e2126; border: 1px dashed #3a424c; border-radius: 14px;
}
.tb-nw-emoji { font-size: 34px; margin-bottom: 10px; }
.tb-nw-title { font-size: 16px; color: #fff; font-weight: 600; }
.tb-nw-text { font-size: 12.5px; color: #7d848e; line-height: 1.9; margin-top: 8px; }
.tb-nw-hint {
  display: inline-block; margin-top: 14px; padding: 7px 14px; border-radius: 8px;
  background: #14171b; border: 1px solid #262b31; color: #7fc4ee;
  font-size: 12px; line-height: 1.8;
}
</style>
