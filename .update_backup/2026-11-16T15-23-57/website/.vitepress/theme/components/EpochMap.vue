<!-- 文件路径: website/docs/.vitepress/theme/components/EpochMap.vue -->
<template>
  <div class="epoch-wrapper" v-if="!isLoading">
    <div class="epoch-container">
      <div class="map-area">
        <svg viewBox="0 0 600 400" class="map-svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#333" stroke-width="1" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <g v-for="country in visibleCountries" :key="country.name" class="country-group">
            <path 
              :d="country.path" 
              :fill="country.color" 
              fill-opacity="0.6" 
              :stroke="country.color" 
              stroke-width="2" 
            />
            <text 
              :x="country.labelX" 
              :y="country.labelY" 
              fill="#fff" 
              font-size="14" 
              font-weight="bold"
              dominant-baseline="middle"
              text-anchor="middle"
            >
              {{ country.name }}
            </text>
          </g>

          <text v-if="visibleCountries.length === 0" x="300" y="200" fill="#666" font-size="16" text-anchor="middle">
            该纪元暂无版图势力
          </text>
        </svg>
      </div>

      <div class="info-panel">
        <h3 class="epoch-title">{{ currentEpoch.name || '未知纪元' }}</h3>
        <p class="epoch-desc">{{ currentEpoch.desc || '暂无描述' }}</p>
        <div class="divider"></div>
        <h4 class="list-title">当前领土势力：</h4>
        
        <ul class="country-list" v-if="visibleCountries.length > 0">
          <li v-for="c in visibleCountries" :key="c.name" class="country-item">
            <span class="color-dot" :style="{ background: c.color }"></span>
            {{ c.name }}
          </li>
        </ul>
        <p v-else style="color: #666; font-size: 14px;">目前没有任何势力存在。</p>
      </div>
    </div>

    <div class="timeline-slider-container">
      <div class="slider-labels">
        <span v-for="(e, index) in epochs" :key="e.id" :class="{ active: currentIndex === index }">
          {{ e.name }}
        </span>
      </div>
      <input 
        type="range" 
        min="0" 
        :max="epochs.length - 1" 
        step="1" 
        v-model.number="currentIndex" 
        class="epoch-slider" 
      />
    </div>
  </div>
  <div v-else style="text-align: center; padding: 50px; color: #888;">加载纪元数据中...</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const epochs = ref([])
const countries = ref([])
const currentIndex = ref(0)
const isLoading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/epoch-map-data.json?t=' + Date.now())
    const data = await res.json()
    
    epochs.value = (data.epochs || []).map(e => ({ ...e, id: String(e.id) }))
    countries.value = (data.countries || []).map(c => ({
      ...c,
      visibleIn: Array.isArray(c.visibleIn) ? c.visibleIn.map(String) : []
    }))
    
    if (epochs.value.length > 0) currentIndex.value = 0
  } catch (e) {
    console.error('加载地图数据失败', e)
  } finally {
    isLoading.value = false
  }
})

const currentEpoch = computed(() => epochs.value[currentIndex.value] || {})

const visibleCountries = computed(() => {
  if (!currentEpoch.value.id) return []
  return countries.value.filter(c => c.visibleIn.includes(currentEpoch.value.id))
})
</script>

<style scoped>
.epoch-wrapper { margin-top: 20px; }
.epoch-container { display: flex; gap: 20px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; overflow: hidden; height: 450px; }
.map-area { flex: 2; position: relative; background: #121212; border-right: 1px solid #333; }
.map-svg { width: 100%; height: 100%; display: block; }
.country-group { transition: all 0.5s ease; animation: fadeIn 0.8s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.info-panel { flex: 1; padding: 30px; background: #1a1a1a; }
.epoch-title { color: #0e639c; margin-top: 0; font-size: 24px; }
.epoch-desc { color: #aaa; line-height: 1.6; font-size: 15px; }
.divider { height: 1px; background: #333; margin: 20px 0; }
.list-title { margin-bottom: 10px; color: #ccc; }
.country-list { list-style: none; padding: 0; margin: 0; }
.country-item { display: flex; align-items: center; margin-bottom: 12px; color: #e0e0e0; font-weight: bold; }
.color-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; box-shadow: 0 0 8px currentColor; }
.timeline-slider-container { margin-top: 20px; background: #252526; padding: 20px 30px; border-radius: 8px; border: 1px solid #333; }
.slider-labels { display: flex; justify-content: space-between; margin-bottom: 15px; color: #666; font-size: 14px; font-weight: bold; }
.slider-labels span { transition: color 0.3s; }
.slider-labels span.active { color: #0e639c; text-shadow: 0 0 10px rgba(14, 99, 156, 0.5); }
.epoch-slider { width: 100%; cursor: pointer; accent-color: #0e639c; }
</style>