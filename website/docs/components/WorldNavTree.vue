<!-- 文件路径: website/docs/components/WorldNavTree.vue -->
<template>
  <div class="world-tree-wrapper">
    <div v-if="loading" style="text-align: center; color: #888; padding: 50px;">
      正在读取世界地图...
    </div>
    <div v-else-if="errorMsg" style="color: #fff; padding: 20px; background: #a82626; border-radius: 8px; text-align: center;">
      {{ errorMsg }}
    </div>
    <div v-else-if="treeData.length === 0" style="text-align: center; color: #888; padding: 50px;">
      暂无设定，请前往后台编辑。
    </div>
    <div v-else>
      <!-- 递归渲染树节点 -->
      <TreeNode v-for="node in treeData" :key="node.name" :node="node" :level="0" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

// 💡 定义递归组件（无需额外建文件，直接在这里定义）
const TreeNode = {
  name: 'TreeNode',
  props: {
    node: Object,
    level: Number
  },
  setup(props) {
    // 默认折叠状态
    const isOpen = ref(false)
    
    // 动态计算缩进和左侧虚线
    const wrapperStyle = computed(() => ({
      marginBottom: '10px',
      marginLeft: props.level > 0 ? '20px' : '0',
      borderLeft: props.level > 0 ? '1px dashed #444' : 'none',
      paddingLeft: props.level > 0 ? '15px' : '0'
    }))
    
    return { isOpen, wrapperStyle }
  },
  template: `
    <div :style="wrapperStyle">
      <!-- 文件夹分支 -->
      <template v-if="node.type === 'folder'">
        <div 
          @click="isOpen = !isOpen" 
          style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #252526; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: background 0.2s;"
          onmouseover="this.style.background='#2d2d2d'"
          onmouseout="this.style.background='#252526'"
        >
          <h2 :style="{ margin: 0, fontSize: level === 0 ? '20px' : '17px', color: '#fff', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }">
            <span :style="{ fontSize: level === 0 ? '22px' : '18px', marginRight: '8px' }">{{ node.icon || '📁' }}</span>
            {{ node.name }}
            <span style="font-size: 12px; color: #0e639c; font-weight: normal; margin-left: 10px;">({{ node.children ? node.children.length : 0 }})</span>
          </h2>
          <span 
            class="arrow-icon" 
            :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: isOpen ? '#0e639c' : '#888' }"
          >▼</span>
        </div>
        
        <div v-show="isOpen" style="padding: 10px 0;">
          <!-- 💡 递归调用自己 -->
          <TreeNode v-for="child in node.children" :key="child.name" :node="child" :level="level + 1" />
        </div>
      </template>

      <!-- 文件卡片 -->
      <template v-else>
        <a 
          :href="node.slug" 
          class="file-link"
          style="display: block; padding: 12px 20px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; text-decoration: none !important; transition: all 0.2s; margin-top: 5px;"
        >
          <h3 style="margin: 0 0 5px 0; color: #fff; font-size: 16px; border: none; padding: 0;">📄 {{ node.name }}</h3>
          <p style="margin: 0; color: #aaa; font-size: 13px; line-height: 1.5;">{{ node.desc || '点击查看详情' }}</p>
        </a>
      </template>
    </div>
  `
}

// 💡 数据获取逻辑
const treeData = ref([])
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/world-tree.json?t=' + Date.now())
    const data = await res.json()
    treeData.value = data || []
  } catch (err) {
    console.error(err)
    errorMsg.value = '⚠️ 读取数据失败，请确保后台已保存世界观树。'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* 悬停时边框变蓝 */
.file-link:hover {
  border-color: #0e639c !important;
}
</style>