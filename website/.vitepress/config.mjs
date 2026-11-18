import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getSidebarItems(dir) {
  let items = []
  if (!fs.existsSync(dir)) return items
  const files = fs.readdirSync(dir).sort((a, b) => a.localeCompare(b, 'zh-CN', {numeric: true}))
  
  for (const file of files) {
    if (file.startsWith('.')) continue
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      const subItems = getSidebarItems(fullPath)
      if (subItems.length > 0) {
        items.push({ 
          text: file, 
          collapsed: true,
          items: subItems 
        })
      }
    } else if (file.endsWith('.md')) {
      // 💡 跳过 xxx.html.md 这类畸形文件（历史 bug 生成，不该出现在导航里）
      if (/\.html?\.md$/i.test(file)) continue
      const title = file.replace('.md', '')
      const relativePath = path.relative(path.resolve(__dirname, '../docs'), fullPath).replace(/\\/g, '/').replace('.md', '')
      items.push({ text: title, link: `/${relativePath}` })
    }
  }
  return items
}

function generateSidebar() {
  const docsDir = path.resolve(__dirname, '../docs')
  const sidebar = []
  if (!fs.existsSync(docsDir)) return sidebar

  const dirs = fs.readdirSync(docsDir).filter(f => {
    const fullPath = path.join(docsDir, f)
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.') && !['assets', 'public', 'components', 'novel', 'plugin', 'node_modules'].includes(f)
  })

  dirs.forEach(dir => {
    const items = getSidebarItems(path.join(docsDir, dir))
    if (items.length > 0) {
      // 💡 collapsed: false = 默认展开，但点标题可以收起/展开
      sidebar.push({ text: dir, items, collapsed: false })
    }
  })
  return sidebar
}

// 💡 小说章节的「上一篇/下一篇」按书柜顺序走，不要用全站侧边栏的顺序
//    （否则看小说时会跳到「00-世界总览」这种设定页）
function buildNovelNav() {
  const p = path.resolve(__dirname, '../docs/public/novel-bookcase.json')
  const map = {}
  if (!fs.existsSync(p)) return map
  let bc = []
  try { bc = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch (e) { return map }
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (!n) continue
      if (n.type === 'folder' && Array.isArray(n.children)) walk(n.children)
    }
  }
  for (const book of bc) {
    if (!book || book.type !== 'folder' || !Array.isArray(book.children)) continue
    const files = book.children.filter((c) => c && c.type === 'file' && c.link)
    files.forEach((f, i) => {
      map[f.link] = {
        prev: files[i - 1] ? { text: files[i - 1].title, link: files[i - 1].link } : false,
        next: files[i + 1] ? { text: files[i + 1].title, link: files[i + 1].link } : false
      }
    })
  }
  return map
}

const NOVEL_NAV = buildNovelNav()

const wikiLinkPlugin = (md) => {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const start = state.pos; const src = state.src;
    if (src.charCodeAt(start) !== 0x5B || src.charCodeAt(start + 1) !== 0x5B) return false;
    const end = src.indexOf(']]', start + 2);
    if (end === -1) return false;
    
    if (!silent) {
      let content = src.slice(start + 2, end);
      // 兼容 Windows 的斜杠
      content = content.replace(/\\/g, '/');
      const token = state.push('html_inline', '', 0);
      token.content = `<a href="/${content}" class="wikilink" style="color: #0e639c; border-bottom: 1px dashed #0e639c; text-decoration: none;">${content}</a>`;
    }
    state.pos = end + 2;
    return true;
  });
};


export default defineConfig({
  title: "幻想域设定集",
  description: "The Veiled Kindred Spirits",
  srcDir: './docs', 
  appearance: 'dark',
  head: [
    ['link', { rel: 'stylesheet', href: '/fonts.css' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }]
  ],
  vite: { resolve: { alias: { '@theme': path.resolve(__dirname, './theme') } } },
  markdown: { config: (md) => { md.use(wikiLinkPlugin) } },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '世界观', link: '/world-navigation' },
      { text: '工具库', link: '/navigation' },
      { text: '金融', link: '/finance' },
      { text: '编年史', link: '/timeline' }
    ],
    sidebar: generateSidebar(),
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' }
  }
})