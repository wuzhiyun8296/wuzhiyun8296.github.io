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

export default defineConfig({
  title: "幻想域设定集",
  description: "The Veiled Kindred Spirits",
  srcDir: './docs', 
  
  // 💡 全局注入字体 CSS (打包后会自动读取 public/fonts.css)
  head: [
    ['link', { rel: 'stylesheet', href: '/fonts.css' }]
  ],
  
  themeConfig: {
    appearance: 'dark',
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