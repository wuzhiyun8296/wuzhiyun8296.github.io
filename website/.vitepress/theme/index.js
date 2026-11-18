// 文件路径: website/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'   // 💡 自定义样式必须在这里引入，否则构建时不会被打包 // 💡 引入你写的自定义布局

export default {
  extends: DefaultTheme, // 继承官方默认主题
  Layout: Layout          // 覆盖官方布局
}