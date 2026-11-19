// 文件路径: website/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'   // 💡 自定义样式必须在这里引入，否则构建时不会被打包 // 💡 引入你写的自定义布局

// 🔤 阅读字体：后台「沉浸码字」里选了字体，会写进 public/reading-font.json，
//    这里读出来挂到 CSS 变量上，小说阅读页自动跟着变。
async function applyReadingFont() {
  if (typeof window === 'undefined') return
  try {
    const res = await fetch('/reading-font.json?t=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (data && data.key && data.key !== 'default') {
      const map = {
        songti: '"Source Han Serif SC", "Noto Serif SC", SimSun, "Songti SC", serif',
        heiti: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
        kaiti: 'KaiTi, "Kaiti SC", STKaiti, "楷体", serif',
        fangsong: 'FangSong, "FangSong_GB2312", STFangsong, "仿宋", serif'
      }
      const css = map[data.key]
      if (css) document.documentElement.style.setProperty('--novel-font', css)
    }
  } catch (e) { /* 离线或还没配置时用默认字体 */ }
}

export default {
  extends: DefaultTheme, // 继承官方默认主题
  Layout: Layout,         // 覆盖官方布局
  enhanceApp() {
    if (typeof window !== 'undefined') {
      applyReadingFont()
    }
  }
}