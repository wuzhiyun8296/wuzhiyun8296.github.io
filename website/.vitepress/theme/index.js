// 文件路径: website/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue' // 💡 引入你写的自定义布局

export default {
  extends: DefaultTheme, // 继承官方默认主题
  Layout: Layout          // 覆盖官方布局
}