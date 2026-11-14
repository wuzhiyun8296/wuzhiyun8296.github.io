<!-- 文件路径: website/.vitepress/theme/Layout.vue -->
<template>
  <DefaultLayout>
    <!-- 💡 插槽：在侧边栏菜单上方（标题下方）注入收起按钮 -->
    <template #sidebar-nav-before>
      <div class="sidebar-collapse-btn" @click="toggleSidebar" title="收起侧边栏">
        <span class="arrow">◀</span> 收起侧边栏
      </div>
    </template>

    <!-- 💡 插槽：在页面最顶层注入悬浮展开按钮（当侧边栏收起时显示） -->
    <template #layout-top>
      <button 
        v-if="isHidden"
        class="sidebar-expand-btn" 
        @click="toggleSidebar"
        title="展开侧边栏"
      >
        ▶
      </button>
    </template>
  </DefaultLayout>
</template>

<script setup>
import DefaultLayout from 'vitepress/dist/client/theme-default/Layout.vue'
import { ref, onMounted } from 'vue'

const isHidden = ref(false)

onMounted(() => {
  // 读取用户上次的偏好
  const saved = localStorage.getItem('sidebar-hidden')
  if (saved === 'true') {
    isHidden.value = true
    document.documentElement.classList.add('sidebar-hidden')
  }
})

const toggleSidebar = () => {
  isHidden.value = !isHidden.value
  if (isHidden.value) {
    document.documentElement.classList.add('sidebar-hidden')
    localStorage.setItem('sidebar-hidden', 'true')
  } else {
    document.documentElement.classList.remove('sidebar-hidden')
    localStorage.setItem('sidebar-hidden', 'false')
  }
}
</script>