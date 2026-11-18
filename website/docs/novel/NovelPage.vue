<!-- 文件路径: website/docs/novel/NovelPage.vue -->
<template>
  <div class="novel-page">
    <header class="novel-header">
      <div class="header-text">
        <h1>📖 幻想域小说集</h1>
        <p>阅读主角穿越后在幻想域的奇妙冒险与故事</p>
      </div>
      <div class="header-stats" v-if="!loading && !errorMsg && totalChapters > 0">
        <span class="stat"><b>{{ totalChapters }}</b> 章</span>
        <span class="stat-divider"></span>
        <span class="stat"><b>{{ folders.length }}</b> 本</span>
      </div>
    </header>

    <div v-if="loading" class="status-box">正在读取书架…</div>
    <div v-else-if="errorMsg" class="status-box error">⚠️ {{ errorMsg }}</div>
    <div v-else-if="bookcase.length === 0" class="status-box">
      书架还是空的，去后台写点内容再推送吧。
    </div>

    <div v-else class="books">
      <section v-for="(book, bi) in books" :key="bi" class="book">
        <div class="book-head">
          <div class="book-title">
            <span class="book-icon">{{ book.icon }}</span>
            <h2>{{ book.title }}</h2>
            <span class="book-count">{{ book.chapters.length }} 章</span>
          </div>
          <a v-if="book.chapters.length" class="read-btn" :href="book.chapters[0].link">
            开始阅读 <span class="arrow">→</span>
          </a>
        </div>

        <div v-if="book.chapters.length" class="chapter-grid">
          <a v-for="ch in book.chapters" :key="ch.link" class="chapter-item" :href="ch.link">
            <span class="ch-no">{{ ch.no }}</span>
            <span class="ch-name">{{ ch.name }}</span>
            <span class="ch-go">›</span>
          </a>
        </div>
        <div v-else class="empty-tip">该卷暂无章节</div>
      </section>
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
    // 💡 没有书架文件 = 还没写过小说，展示空状态就行，不要报错
    if (res.status === 404) { bookcase.value = []; return }
    if (!res.ok) throw new Error('读取失败')
    bookcase.value = await res.json()
  } catch (err) {
    errorMsg.value = '未找到书架数据。请确保你已经在后台写了小说，并点击过【一键推送】。'
  } finally {
    loading.value = false
  }
})

// 把「第01章 初识世界」拆成 序号 01 + 名字 初识世界
const parseChapter = (title) => {
  const t = String(title || '').trim()
  const m = t.match(/^第\s*([0-9]+|[一二三四五六七八九十百千]+)\s*章[\s:：·.\-]*(.*)$/)
  if (m) return { no: m[1], name: m[2] || t }
  const n = t.match(/^([0-9]+)[\s.、\-_]+(.*)$/)
  if (n) return { no: n[1], name: n[2] || t }
  return { no: '·', name: t }
}

const books = computed(() => {
  const out = []
  for (const item of bookcase.value) {
    if (!item) continue
    if (item.type === 'folder') {
      const children = (item.children || []).filter((c) => c && c.type === 'file')
      out.push({
        icon: '📚',
        title: item.title,
        chapters: children.map((c) => ({ ...parseChapter(c.title), link: c.link }))
      })
    }
  }
  const loose = bookcase.value.filter((b) => b && b.type === 'file')
  if (loose.length) {
    out.push({
      icon: '📄',
      title: '未分卷章节',
      chapters: loose.map((c) => ({ ...parseChapter(c.title), link: c.link }))
    })
  }
  return out
})

const folders = computed(() => books.value.filter((b) => b.icon === '📚'))
const totalChapters = computed(() => books.value.reduce((n, b) => n + b.chapters.length, 0))
</script>

<style scoped>
.novel-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ---------- 页头 ---------- */
.novel-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}
.header-text h1 {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 10px;
  padding: 0;
  border: none;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}
.header-text p {
  margin: 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
}
.header-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}
.header-stats .stat {
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.header-stats .stat b {
  font-size: 18px;
  color: var(--vp-c-brand-1);
  margin-right: 3px;
}
.stat-divider {
  width: 1px;
  height: 16px;
  background: var(--vp-c-divider);
}

/* ---------- 状态 ---------- */
.status-box {
  padding: 28px;
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-2);
  text-align: center;
}
.status-box.error {
  border-color: #a82626;
  color: var(--vp-c-text-1);
}

/* ---------- 书 ---------- */
.books {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.book {
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  transition: border-color 0.25s;
}
.book:hover {
  border-color: var(--vp-c-brand-1);
}
.book-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(180deg, var(--vp-c-bg-alt), var(--vp-c-bg-soft));
  border-bottom: 1px solid var(--vp-c-divider);
}
.book-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.book-icon {
  font-size: 22px;
  line-height: 1;
}
.book-title h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  padding: 0;
  border: none;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book-count {
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
  white-space: nowrap;
}
.read-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--vp-c-brand-1);
  text-decoration: none !important;
  transition: transform 0.2s, filter 0.2s;
}
.read-btn:hover {
  filter: brightness(1.1);
  transform: translateX(2px);
}
.read-btn .arrow {
  transition: transform 0.2s;
}
.read-btn:hover .arrow {
  transform: translateX(3px);
}

/* ---------- 章节 ---------- */
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2px;
  padding: 12px;
}
.chapter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 10px;
  text-decoration: none !important;
  color: var(--vp-c-text-2);
  transition: background 0.18s, color 0.18s;
  min-width: 0;
}
.chapter-item:hover {
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  color: var(--vp-c-text-1);
}
.ch-no {
  flex-shrink: 0;
  min-width: 34px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 3px 0;
  border-radius: 6px;
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent);
}
.ch-name {
  flex: 1;
  font-size: 14.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-go {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: opacity 0.18s, transform 0.18s;
}
.chapter-item:hover .ch-go {
  opacity: 1;
  transform: translateX(2px);
}
.empty-tip {
  padding: 20px 24px;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

@media (max-width: 640px) {
  .novel-page { padding: 32px 16px 60px; }
  .header-text h1 { font-size: 26px; }
  .chapter-grid { grid-template-columns: 1fr; }
}
</style>
