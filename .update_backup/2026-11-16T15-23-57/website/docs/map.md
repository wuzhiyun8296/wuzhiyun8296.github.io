<script setup>
import { ref, onMounted } from 'vue'

const mapData = ref({ image: '', markers: [] })
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/map.json?t=' + Date.now())
    if (res.ok) {
      mapData.value = await res.json()
    }
    
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

const renderMap = () => {
  if (!mapData.value.image) return
  
  // 确保DOM加载完毕
  setTimeout(() => {
    const map = L.map('frontend-map', {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4
    })

    const img = new Image()
    img.src = mapData.value.image
    img.onload = () => {
      const w = img.width
      const h = img.height
      const bounds = [[0, 0], [h, w]]
      
      L.imageOverlay(mapData.value.image, bounds).addTo(map)
      map.fitBounds(bounds)
      map.setMaxBounds(bounds)

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
</style>