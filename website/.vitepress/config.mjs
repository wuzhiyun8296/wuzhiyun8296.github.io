import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 💡 递归生成多级侧边栏
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
        // 💡 核心：加上 collapsed 属性，控制子菜单的折叠
        items.push({ 
          text: file, 
          collapsed: true, // 默认收起，点击即可展开
          items: subItems 
        })
      }
    } else if (file.endsWith('.md')) {
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

  // 过滤掉系统文件夹
  const dirs = fs.readdirSync(docsDir).filter(f => {
    const fullPath = path.join(docsDir, f)
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.') && !['assets', 'public', 'components', 'novel'].includes(f)
  })

  dirs.forEach(dir => {
    const items = getSidebarItems(path.join(docsDir, dir))
    if (items.length > 0) {
      sidebar.push({ text: dir, items })
    }
  })
  return sidebar
}

const wikiLinkPlugin = (md) => {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const start = state.pos; const src = state.src;
    if (src.charCodeAt(start) !== 0x5B || src.charCodeAt(start + 1) !== 0x5B) return false;
    const end = src.indexOf(']]', start + 2);
    if (end === -1) return false;
    if (!silent) {
      const content = src.slice(start + 2, end);
      const token = state.push('html_inline', '', 0);
      token.content = `<a href="/${content}" class="wikilink">${content}</a>`;
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