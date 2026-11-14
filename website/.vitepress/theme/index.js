// 文件路径: website/docs/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import EpochMap from './components/EpochMap.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 全局注册自定义组件
    app.component('EpochMap', EpochMap)
  }
}