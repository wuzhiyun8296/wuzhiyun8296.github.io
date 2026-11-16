<!-- 文件路径: website/docs/components/WorldTreeRender.vue -->
<template>
  <div class="world-tree-wrapper">
    <div v-if="loading" style="text-align: center; color: #888; padding: 50px;">
      正在读取数据...
    </div>
    <div v-else-if="errorMsg" style="text-align: center; color: #fff; padding: 20px; background: #a82626; border-radius: 8px;">
      {{ errorMsg }}
    </div>
    <div v-else-if="!treeData || treeData.length === 0" style="text-align: center; color: #888; padding: 50px; background: #252526; border-radius: 8px;">
      暂无设定，请前往后台的世界观树配置并点击推送。
    </div>
    <div v-else>
      <TreeNode v-for="node in treeData" :key="node.name" :node="node" :level="0" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TreeNode from './TreeNode.vue' // 💡 引入刚才创建的独立组件

const treeData = ref([])
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'world-tree.json?t=' + Date.now())
    if (!res.ok) throw new Error('找不到文件')
    const data = await res.json()
    treeData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    errorMsg.value = '⚠️ 未能找到 world-tree.json 数据，请去后台点击“一键推送”生成数据。'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
</style>