<script setup>
import { ref, onMounted } from 'vue'

const mapData = ref({ image: '', markers: [] })
// 历史模拟里的据点（和地图共用同一套 400×225 网格坐标）
const historyData = ref({ states: [], sites: [], grid: { cols: 400, rows: 225 } })
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/map.json?t=' + Date.now())
    if (res.ok) {
      mapData.value = await res.json()
    }

    // 顺手读历史模拟的据点（没有也不影响）
    try {
      const hr = await fetch('/history.json?t=' + Date.now())
      if (hr.ok) {
        const hd = await hr.json()
        if (hd && hd.sites) historyData.value = hd
      }
    } catch (e) { /* 忽略 */ }

    // 动态加载 Leaflet
    if (!document.getElementById('leaflet-js')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => renderMap()
      document.head.appendChild(script)
    } else {
      renderMap()
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

// 国名标注：从 map.json 的版图（游程压缩）算出每个国家的重心，再贴文字
// 注意：map 实例是 renderMap 里的局部变量，必须显式传进来
const drawCountryLabels = (map, w, h) => {
  const t = mapData.value.territory
  if (!t || !Array.isArray(t.cells) || !t.cols || !t.rows) return
  const cols = t.cols, rows = t.rows

  // 整段连续解压（游程可以跨行）
  const owner = new Int16Array(cols * rows).fill(-1)
  let i = 0, pos = 0
  while (i + 1 < t.cells.length && pos < owner.length) {
    const len = t.cells[i], val = t.cells[i + 1]
    i += 2
    for (let k = 0; k < len && pos < owner.length; k++) owner[pos++] = val
  }

  const acc = {}
  for (let p = 0; p < owner.length; p++) {
    const v = owner[p]
    if (v < 0) continue
    const a = acc[v] || (acc[v] = { sx: 0, sy: 0, n: 0 })
    a.sx += p % cols
    a.sy += Math.floor(p / cols)
    a.n++
  }

  Object.keys(acc).forEach(id => {
    const a = acc[id]
    if (a.n < 150) return
    const name = (mapData.value.countryNames && mapData.value.countryNames[id]) || ('国家 #' + (Number(id) + 1))
    const lat = h - (a.sy / a.n) * (h / rows)
    const lng = (a.sx / a.n) * (w / cols)
    const icon = L.divIcon({ className: 'country-label', html: `<span>${name}</span>`, iconSize: [0, 0] })
    L.marker([lat, lng], { icon, interactive: false, keyboard: false }).addTo(map)
  })
}

// 据点：来自历史模拟的 sites，按类型给图标、按归属给颜色
const drawSites = (map, w, h) => {
  const hd = historyData.value
  if (!hd || !Array.isArray(hd.sites) || !hd.sites.length) return
  const cols = (hd.grid && hd.grid.cols) || 400
  const rows = (hd.grid && hd.grid.rows) || 225
  const emoji = { city: '🏙️', fortress: '🏰', pass: '🚧', port: '⚓' }
  const stateById = {}
  ;(hd.states || []).forEach(s => { stateById[s.id] = s })

  hd.sites.forEach(site => {
    const lat = h - (site.y / rows) * h
    const lng = (site.x / cols) * w
    const st = stateById[site.owner]
    const color = st ? st.color : '#9aa4ad'
    const icon = L.divIcon({
      className: 'site-pin',
      html: `<div class="site-dot" style="--c:${color}">${emoji[site.type] || '📍'}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    })
    const m = L.marker([lat, lng], { icon }).addTo(map)
    m.bindTooltip(
      `${site.name}${st ? ' · ' + st.name : ' · 无主'}`,
      { direction: 'top', offset: [0, -14], className: 'site-tip' }
    )
  })
}

const renderMap = () => {
  if (!mapData.value.image) return
  
  // 确保DOM加载完毕
  setTimeout(() => {
    const map = L.map('frontend-map', {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      // ⚠️ CRS.Simple 下 1 个单位 = 1 像素，默认只允许整数缩放，
      //    fitBounds 只能退到 -2 档（1600×900 被缩成 400×225），
      //    必须允许分数缩放才能刚好铺满容器
      zoomSnap: 0,
      zoomDelta: 0.25,
      attributionControl: false
    })

    const img = new Image()
    img.src = mapData.value.image
    img.onload = () => {
      const w = img.width
      const h = img.height
      const bounds = [[0, 0], [h, w]]

      // 容器高度按底图真实比例调整，避免 16:9 的图塞进固定 700px 里出现大片黑边
      const el = document.getElementById('frontend-map')
      if (el && el.clientWidth > 0) {
        el.style.height = Math.round(el.clientWidth * h / w) + 'px'
        map.invalidateSize()
      }

      L.imageOverlay(mapData.value.image, bounds).addTo(map)
      map.fitBounds(bounds, { padding: [0, 0] })
      map.setMaxBounds(bounds)

      // 🏷️ 国名标注：按版图重心算位置，不依赖图片里有没有画字
      try { drawCountryLabels(map, w, h) } catch (e) { console.error('国名标注失败', e) }

      // 📍 据点（来自历史模拟）
      try { drawSites(map, w, h) } catch (e) { console.error('据点渲染失败', e) }

      // 渲染标记
      mapData.value.markers.forEach(m => {
        const marker = L.marker([m.lat, m.lng]).addTo(map)
        
        // 自定义弹出框内容
        let popupHtml = `<div style="font-family: sans-serif;">
          <h3 style="margin:0 0 5px 0; color:#0e639c;">${m.title}</h3>
          <p style="margin:0; font-size:13px; color:#aaa;">${m.desc || ''}</p>
        `
        if (m.link) {
          popupHtml += `<a href="${m.link}" style="display:inline-block; margin-top:10px; padding:4px 10px; background:#0e639c; color:#fff; text-decoration:none; border-radius:4px; font-size:12px;">前往查看 →</a>`
        }
        popupHtml += `</div>`

        marker.bindPopup(popupHtml, {
          className: 'custom-dark-popup'
        })
      })
    }
  }, 100)
}
</script>

# 🗺️ 世界地图

<div v-if="loading" style="text-align:center; padding:50px; color:#888;">正在展开大陆版图...</div>

<div v-show="!loading" style="margin-top: 20px;">
  <div v-if="!mapData.image" style="text-align:center; padding:50px; background:#252526; border:1px dashed #444; border-radius:12px; color:#888;">
    尚未上传世界地图，请前往后台“🗺️ 世界地图”上传底图。
  </div>
  <div v-else id="frontend-map" style="width: 100%; height: 700px; background: #111; border-radius: 12px; border: 1px solid #333; z-index: 1;"></div>
</div>

<style>
/* 覆盖 Leaflet 默认的亮色弹窗为暗黑风 */
.custom-dark-popup .leaflet-popup-content-wrapper {
  background: #252526 !important;
  color: #fff !important;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}
.custom-dark-popup .leaflet-popup-tip {
  background: #252526 !important;
  border-top: 1px solid #444;
  border-left: 1px solid #444;
}
/* 隐藏底部 logo */
.leaflet-control-attribution { display: none !important; }

/* 国名标注 */
.country-label span {
  position: absolute;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  color: #fff;
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 1px;
  text-shadow: 0 0 8px #000, 0 0 3px #000, 1px 1px 3px #000;
  pointer-events: none;
}

/* 据点图钉 */
.site-pin { pointer-events: auto; }
.site-dot {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; line-height: 1;
  background: radial-gradient(circle at 50% 40%, rgba(255,255,255,.18), rgba(0,0,0,.55));
  border: 2px solid var(--c, #9aa4ad);
  box-shadow: 0 0 0 2px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.6);
  transition: transform .15s;
  cursor: pointer;
}
.site-dot:hover { transform: scale(1.18); }
.site-tip {
  background: rgba(20,20,24,.92) !important;
  border: 1px solid #444 !important;
  color: #fff !important;
  font-size: 12px !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 14px rgba(0,0,0,.5) !important;
}
.site-tip::before { border-top-color: rgba(20,20,24,.92) !important; }
</style>