<!-- 文件路径: website/docs/components/WorldTree.vue -->
<template>
  <div class="tree-wrapper">
    <!-- 这里用于渲染你的结构树 -->
    <div ref="treeContainer" class="tree-container">
      <div style="color: #888; text-align: center; padding-top: 50px;">
        正在加载世界观结构...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
// 如果你需要用到 echarts，取消下面这行的注释
// import * as echarts from 'echarts'

const treeContainer = ref(null)
// let chartInstance = null

onMounted(() => {
  if (!treeContainer.value) return

  // ========================================================
  // 💡 在这里替换成你原本写在 world-navigation.md 里的业务逻辑
  // ========================================================
  
  // 这是一个纯 HTML 的示例，用来替代你原本可能有的 document 操作
  treeContainer.value.innerHTML = `
    <div style="padding: 20px; color: #ccc; font-family: sans-serif;">
      <h2 style="color: #fff;">🌳 世界观核心架构</h2>
      <ul style="line-height: 2; font-size: 16px;">
        <li>📁 国家阵营</li>
        <li>📁 历史纪年</li>
        <li>📁 魔法体系</li>
      </ul>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        (你可以在这里画 ECharts 图表，或者渲染你的节点数据)
      </p>
    </div>
  `

  // 如果你用的是 ECharts，大概是这样的：
  /*
  chartInstance = echarts.init(treeContainer.value)
  chartInstance.setOption({
    series: [{ type: 'tree', data: [/* 你的数据 */] }]
  })
  */
})

onUnmounted(() => {
  // if (chartInstance) chartInstance.dispose()
})
</script>

<style scoped>
.tree-wrapper {
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 20px;
}
.tree-container {
  width: 100%;
  height: 600px;
  background: #121212;
}
</style>