<script setup>
import { ref, computed, onMounted } from 'vue'

const events = ref([])
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/public/timeline.json')
    if (res.ok) {
      events.value = await res.json()
    } else {
      errorMsg.value = '未能找到时间线数据，请去后台保存一次时间线。'
    }
  } catch (error) {
    console.error("加载时间线失败", error)
    errorMsg.value = '数据加载失败，请检查控制台。'
  } finally {
    loading.value = false
  }
})

const lanes = computed(() => {
  const groups = {}
  events.value.forEach(e => {
    const cat = e.category || '未分类主线'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(e)
  })
  
  for(let key in groups) {
    // 将 a 和 b 的位置互换，实现倒序
    groups[key].sort((a, b) => b.date.localeCompare(a.date, 'zh-CN', {numeric: true}))
  }
  
  return groups
})
</script>

# ⏳ 幻想域编年史

<div v-if="loading" style="text-align: center; color: #888; padding: 50px;">
  正在读取时间的轨迹...
</div>

<div v-else-if="errorMsg" style="text-align: center; color: #a82626; padding: 50px; background: rgba(168,38,38,0.1); border-radius: 8px;">
  ⚠️ {{ errorMsg }}
</div>

<div v-else class="swimlane-wrapper">
  <div class="swimlane" v-for="(laneEvents, laneName) in lanes" :key="laneName">
    <div class="lane-title">{{ laneName }}</div>
    <div class="lane-content">
      <div class="timeline-item" v-for="(event, index) in laneEvents" :key="index">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-date">{{ event.date }}</span>
          <h3>{{ event.title }}</h3>
          <p>{{ event.description }}</p>
        </div>
      </div>
    </div>
  </div>
  
  <div v-if="Object.keys(lanes).length === 0" style="width: 100%; text-align: center; color: #888; padding: 50px;">
    时间线目前是空的，请前往后台编辑器添加。
  </div>
</div>

<style scoped>
.swimlane-wrapper {
  display: flex;
  gap: 30px;
  margin-top: 30px;
  overflow-x: auto;
  padding-bottom: 20px;
  align-items: flex-start;
}
.swimlane-wrapper::-webkit-scrollbar { height: 8px; }
.swimlane-wrapper::-webkit-scrollbar-track { background: #1e1e1e; }
.swimlane-wrapper::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
.swimlane-wrapper::-webkit-scrollbar-thumb:hover { background: #555; }

.swimlane {
  flex: 1;
  min-width: 320px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;
}

.lane-title {
  text-align: center;
  font-weight: bold;
  color: #fff;
  background: #252526;
  padding: 12px;
  border-radius: 12px 12px 0 0;
  border-bottom: 2px solid var(--vp-c-brand-1, #0e639c);
  letter-spacing: 1px;
}

.lane-content {
  position: relative;
  padding: 20px 0;
}

.lane-content::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 20px;
  width: 2px;
  background: #333;
}

.timeline-item {
  position: relative;
  padding-left: 50px;
  padding-right: 15px;
  margin-bottom: 25px;
}

.timeline-dot {
  position: absolute;
  left: 14px;
  top: 5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--vp-c-brand-1, #0e639c);
  box-shadow: 0 0 10px var(--vp-c-brand-1, #0e639c);
  border: 2px solid #1a1a1a;
  z-index: 1;
}

.timeline-content {
  background: var(--vp-c-bg-soft, #252526);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
}

.timeline-content:hover {
  transform: translateY(-2px);
  border-color: #555;
}

.timeline-date {
  color: var(--vp-c-brand-1, #0e639c);
  font-weight: bold;
  font-size: 13px;
}

.timeline-content h3 {
  margin: 8px 0;
  color: #fff;
  font-size: 16px;
  border-bottom: none;
  padding-bottom: 0;
}

.timeline-content p {
  margin: 0;
  color: #aaa;
  font-size: 14px;
  line-height: 1.5;
}
</style>