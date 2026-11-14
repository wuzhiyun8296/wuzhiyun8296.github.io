<!-- 文件路径: website/docs/novel/NovelPage.vue -->
<template>
  <div class="novel-page-container">
    <h1 class="page-title">📖 幻想域小说集</h1>
    <p class="page-subtitle">阅读主角穿越后在幻想域的奇妙冒险与故事。</p>

    <div v-if="loading" class="status-box">正在读取书架数据...</div>
    
    <div v-else-if="errorMsg" class="status-box error">⚠️ {{ errorMsg }}</div>

    <div v-else-if="bookcase.length === 0" class="status-box">书架空空如也，请前往后台写点小说并推送。</div>

    <div v-else class="bookcase-grid">
      <div v-for="(folder, idx) in folders" :key="idx" class="vol-card">
        <div class="vol-title">
          <span class="icon">📚</span> {{ folder.title }}
        </div>
        <ul class="chapter-list" v-if="folder.children && folder.children.length > 0">
          <li v-for="(file, fIdx) in folder.children.filter(c => c.type === 'file')" :key="fIdx">
            <a :href="file.link">{{ file.title }}</a>
          </li>
        </ul>
        <div v-else class="empty-tip">该卷暂无章节</div>
      </div>
      
      <div v-if="looseFiles.length > 0" class="vol-card">
        <div class="vol-title"><span class="icon">📄</span> 未分卷章节</div>
        <ul class="chapter-list">
          <li v-for="(file, idx) in looseFiles" :key="idx">
            <a :href="file.link">{{ file.title }}</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const bookcase = ref([])
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/novel-bookcase.json')
    if (!res.ok) throw new Error('文件不存在')
    bookcase.value = await res.json()
  } catch (err) {
    errorMsg.value = '未找到书架数据。请确保你已经在后台写了小说，并点击了【一键推送】。'
  } finally {
    loading.value = false
  }
})

const folders = computed(() => bookcase.value.filter(b => b && b.type === 'folder'))
const looseFiles = computed(() => bookcase.value.filter(b => b && b.type === 'file'))
</script>

<style scoped>
.novel-page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}
.page-title {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  border-bottom: none;
  margin-bottom: 10px;
  padding: 0;
}
.page-subtitle {
  color: #888;
  margin-bottom: 30px;
}
.status-box {
  color: #888;
  padding: 20px;
  background: #252526;
  border-radius: 8px;
}
.status-box.error {
  color: #fff;
  background: #a82626;
}
.bookcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.vol-card {
  background: #252526;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s, border-color 0.2s;
}
.vol-card:hover {
  border-color: #0e639c;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.vol-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #444;
  display: flex;
  align-items: center;
  gap: 8px;
}
.chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.chapter-list li {
  margin-bottom: 8px;
}
.chapter-list a {
  color: #aaa;
  text-decoration: none !important;
  font-size: 14px;
  display: block;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #1a1a1a;
  border: 1px solid transparent;
}
.chapter-list a:hover {
  background: rgba(14, 99, 156, 0.15);
  color: #fff;
  border-color: #0e639c;
}
.empty-tip {
  color: #666;
  font-size: 13px;
  font-style: italic;
}
</style>