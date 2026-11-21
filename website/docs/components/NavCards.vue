<template>
  <div class="nav-wrapper">
    <div v-if="loading" class="tip">正在加载数据...</div>
    <div v-else-if="error" class="tip error">
      <strong>❌ 数据加载失败：</strong> {{ error }}
      <br><br>
      <span style="font-size: 12px; color: #888;">排查：请确认后台 http://localhost:3001 已启动，且 website/docs/public/navigation.json 存在。</span>
    </div>
    <div v-else class="nav-grid">
      <a v-for="card in navList" :key="card.id" :href="card.link" class="nav-card">
        <div class="nav-icon">{{ card.icon }}</div>
        <div class="nav-content">
          <h3>{{ card.title }}</h3>
          <p>{{ card.desc }}</p>
        </div>
      </a>

    <a href="/tech-tree" class="nav-card">
      <div class="nav-icon">🌳</div>
      <div class="nav-content">
        <h3>科技树</h3>
        <p>看看你现在走到哪个时代、完成了哪些科技、分别是什么时候完成的。</p>
      </div>
    </a>



      <div v-if="navList.length === 0" class="tip">目前没有任何导航数据。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const navList = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/navigation.json?t=' + Date.now())
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // 💡 过滤掉被设置为「隐藏前端」的卡片
    // 💡 前台只显示「共用 / 前台专用」的条目；后端专用（scope=admin）不出现。
    //    同时过滤掉没有真实链接的条目（link 为 # 或空），否则点了没反应。
    const usable = (n) => {
      if (!n) return false
      if (n.hideFrontend) return false
      if (n.scope === 'admin' || n.scope === 'hidden') return false
      // 💡 后台「插件工厂」里没勾「推荐到前端」的，前台工具库不展示
      if (n.featured === false) return false
      const link = String(n.link || '').trim()
      return link !== '' && link !== '#'
    }
    navList.value = Array.isArray(data) ? data.filter(usable) : []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.nav-wrapper { min-height: 100px; }
.nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
.nav-card { display: flex; align-items: flex-start; gap: 15px; background: var(--vp-c-bg-soft, #252526); padding: 20px; border-radius: 12px; border: 1px solid #333; text-decoration: none !important; transition: 0.2s; }
.nav-card:hover { transform: translateY(-4px); border-color: var(--vp-c-brand-1, #0e639c); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.nav-icon { font-size: 32px; background: #1e1e1e; padding: 10px; border-radius: 10px; border: 1px solid #444; }
.nav-content h3 { margin: 0 0 8px 0; color: #fff; font-size: 16px; border-bottom: none; padding: 0; }
.nav-content p { margin: 0; color: #aaa; font-size: 13px; line-height: 1.5; }
.tip { text-align: center; padding: 40px; color: #888; }
.tip.error { color: #ff6b6b; background: rgba(255, 107, 107, 0.1); border: 1px dashed #ff6b6b; border-radius: 8px; }
</style>