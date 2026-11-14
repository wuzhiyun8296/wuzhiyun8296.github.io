import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 自动生成侧边栏的函数
function generateSidebar() {
  const docsDir = path.resolve(__dirname, '../docs')
  const sidebar = []
  
  if (!fs.existsSync(docsDir)) return sidebar

  const dirs = fs.readdirSync(docsDir).filter(f => {
    const fullPath = path.join(docsDir, f)
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.') && f !== 'assets' && f !== 'public'
  })

  dirs.forEach(dir => {
    const items = []
    const files = fs.readdirSync(path.join(docsDir, dir))
    
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const title = file.replace('.md', '')
        items.push({ text: title, link: `/${dir}/${file.replace('.md', '')}` })
      }
    })
    
    if (items.length > 0) {
      sidebar.push({
        text: dir,
        items: items
      })
    }
  })
  
  return sidebar
}

// 💡 双向链接 Markdown 插件
const wikiLinkPlugin = (md) => {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const start = state.pos;
    const src = state.src;
    if (src.charCodeAt(start) !== 0x5B || src.charCodeAt(start + 1) !== 0x5B) return false;
    const end = src.indexOf(']]', start + 2);
    if (end === -1) return false;
    if (!silent) {
      const content = src.slice(start + 2, end);
      const token = state.push('html_inline', '', 0);
      // 自动转换为带样式的超链接
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
  
  // 💡 保留默认黑暗模式
  appearance: 'dark',

  // 💡 注入字体 CSS 和 网页图标
  head: [
    ['link', { rel: 'stylesheet', href: '/fonts.css' }],
    // 👇 换图标的核心代码：把 /favicon.png 换成你放进 public 里的图片路径
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }] 
  ],

  // 💡 修复打包报错：显式指定 @theme 别名路径
  vite: {
    resolve: {
      alias: {
        '@theme': path.resolve(__dirname, './theme')
      }
    }
  },

  // 💡 挂载双向链接插件
  markdown: {
    config: (md) => {
      md.use(wikiLinkPlugin)
    }
  },
  
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
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    }
  }
})