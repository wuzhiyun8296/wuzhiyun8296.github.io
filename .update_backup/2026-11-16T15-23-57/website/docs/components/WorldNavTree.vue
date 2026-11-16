<!-- 文件路径: website/docs/components/WorldNavTree.vue -->
<template>
  <div class="world-nav-tree">
    <div v-if="loading" class="status-tip">正在读取世界结构...</div>
    
    <div v-else-if="errorMsg" class="error-box">{{ errorMsg }}</div>
    
    <div v-else-if="treeData.length === 0" class="status-tip">
      暂无设定，请前往后台的“🌍 世界观树”配置并保存。
    </div>

    <div v-else>
      <!-- 第一层渲染 -->
      <div v-for="node in treeData" :key="node.name" class="level-1">
        
        <!-- 情况 A：第一层是文件夹 -->
        <div v-if="node.type === 'folder'" class="folder-box">
          <div class="folder-header" @click="toggle(node.name)">
            <div class="folder-title">
              <span class="icon">{{ node.icon || '📁' }}</span>
              {{ node.name }}
              <span class="count">({{ node.children ? node.children.length : 0 }})</span>
            </div>
            <span class="arrow" :class="{ open: expanded[node.name] }">▼</span>
          </div>
          
          <div v-show="expanded[node.name]" class="folder-content">
            <!-- 第二层渲染 -->
            <div v-for="child in node.children" :key="child.name" class="level-2">
              
              <!-- 第二层是文件夹 -->
              <div v-if="child.type === 'folder'" class="sub-folder-box">
                <div class="folder-header sub-header" @click="toggle(node.name + '_' + child.name)">
                  <div class="folder-title">
                    <span class="icon">📁</span>
                    {{ child.name }}
                  </div>
                  <span class="arrow" :class="{ open: expanded[node.name + '_' + child.name] }">▼</span>
                </div>
                
                <div v-show="expanded[node.name + '_' + child.name]" class="folder-content sub-content">
                  <!-- 第三层（文件） -->
                  <a v-for="sub in child.children" :key="sub.name" :href="sub.slug" class="file-card">
                    <div class="file-name">📄 {{ sub.name }}</div>
                    <div class="file-desc">{{ sub.desc || '点击查看详情' }}</div>
                  </a>
                </div>
              </div>

              <!-- 第二层直接是文件 -->
              <a v-else :href="child.slug" class="file-card">
                <div class="file-name">📄 {{ child.name }}</div>
                <div class="file-desc">{{ child.desc || '点击查看详情' }}</div>
              </a>

            </div>
          </div>
        </div>

        <!-- 情况 B：第一层直接是文件 -->
        <a v-else :href="node.slug" class="file-card">
          <div class="file-name">📄 {{ node.name }}</div>
          <div class="file-desc">{{ node.desc || '点击查看详情' }}</div>
        </a>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const treeData = ref([])
const loading = ref(true)
const errorMsg = ref('')
const expanded = ref({})

const toggle = (id) => {
  expanded.value[id] = !expanded.value[id]
}

onMounted(async () => {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'world-tree.json?t=' + Date.now())
    if (!res.ok) throw new Error('文件不存在')
    const data = await res.json()
    treeData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    errorMsg.value = '⚠️ 未能找到数据，请去后台点击“一键推送”生成并同步。'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.world-nav-tree {
  min-height: 200px;
  margin-top: 20px;
}
.status-tip {
  color: #888;
  padding: 30px;
  background: #252526;
  border-radius: 8px;
  text-align: center;
}
.error-box {
  color: #fff;
  padding: 20px;
  background: #a82626;
  border-radius: 8px;
}
.level-1 {
  margin-bottom: 12px;
}
.folder-box {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}
.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #252526;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.folder-header:hover {
  background: #2d2d2d;
}
.sub-header {
  background: transparent;
  padding: 10px 15px;
}
.sub-header:hover {
  background: rgba(255, 255, 255, 0.05);
}
.folder-title {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sub-folder-box .folder-title {
  font-size: 16px;
  color: #ccc;
}
.icon {
  font-size: 20px;
}
.count {
  font-size: 13px;
  color: #0e639c;
  font-weight: normal;
}
.arrow {
  color: #888;
  font-size: 12px;
  transition: transform 0.3s;
}
.arrow.open {
  transform: rotate(180deg);
  color: #0e639c;
}
.folder-content {
  padding: 10px 0 10px 20px;
  border-left: 1px dashed #444;
  margin-left: 20px;
}
.sub-content {
  margin-left: 10px;
  padding-left: 15px;
  border-left: 1px dashed #333;
}
.level-2 {
  margin-bottom: 8px;
}
.sub-folder-box {
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 8px;
}
.file-card {
  display: block;
  padding: 12px 20px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  text-decoration: none !important;
  margin-bottom: 8px;
  transition: all 0.2s;
}
.file-card:hover {
  border-color: #0e639c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.file-name {
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 4px;
}
.file-desc {
  color: #888;
  font-size: 13px;
  line-height: 1.5;
}
</style>