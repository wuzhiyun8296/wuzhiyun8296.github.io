<!-- 文件路径: website/docs/components/TreeNode.vue -->
<template>
  <div :style="wrapperStyle">
    <!-- 文件夹 -->
    <template v-if="node && node.type === 'folder'">
      <div 
        @click="isOpen = !isOpen"
        style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #252526; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: background 0.2s;"
      >
        <div style="color: #fff; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
          <!-- 如果后台没填图标，默认显示 📂 -->
          <span style="margin-right: 8px; font-size: 20px;">{{ node.icon || '📂' }}</span>
          {{ node.name }}
          <span style="font-size: 12px; color: #0e639c; font-weight: normal; margin-left: 10px;">
            ({{ node.children ? node.children.length : 0 }})
          </span>
        </div>
        <span :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: '#888', fontSize: '12px' }">▼</span>
      </div>
      
      <div v-show="isOpen" style="margin-top: 10px;">
        <!-- 递归调用自身 -->
        <TreeNode 
          v-for="child in node.children" 
          :key="child.name" 
          :node="child" 
          :level="level + 1" 
        />
      </div>
    </template>

    <!-- 文件 -->
    <template v-else-if="node && node.type === 'file'">
      <a :href="node.slug" style="display: block; padding: 12px 20px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; text-decoration: none; transition: all 0.2s; margin-top: 5px;" class="file-link">
        <div style="color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 4px;">📄 {{ node.name }}</div>
        <div style="color: #888; font-size: 13px;">{{ node.desc || '点击查看详情' }}</div>
      </a>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: Object,
  level: Number
})

const isOpen = ref(false)

const wrapperStyle = computed(() => ({
  marginBottom: '10px',
  marginLeft: props.level > 0 ? '20px' : '0',
  borderLeft: props.level > 0 ? '1px dashed #444' : 'none',
  paddingLeft: props.level > 0 ? '15px' : '0'
}))
</script>

<style scoped>
.file-link:hover {
  border-color: #0e639c !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
</style>