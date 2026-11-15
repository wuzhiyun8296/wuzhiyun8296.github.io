<!-- 文件路径: website/.vitepress/theme/Layout.vue -->
<template>
  <DefaultLayout>
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

onMounted(async () => {
  // 侧边栏逻辑
  const saved = localStorage.getItem('sidebar-hidden')
  if (saved === 'true') {
    isHidden.value = true
    document.documentElement.classList.add('sidebar-hidden')
  }

  // 💡 版权保护：强制防选中 + 复制拦截报警
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'protection-config.json?t=' + Date.now());
    const config = await res.json();

    if (config.enableAntiCopy) {
      
      // 1. 强制注入 CSS：除了代码块和输入框，其他全都不许选中
      const style = document.createElement('style');
      style.innerHTML = `
        body, p, span, h1, h2, h3, h4, h5, h6, li, td, th { 
          -webkit-user-select: none !important; 
          -moz-user-select: none !important; 
          -ms-user-select: none !important; 
          user-select: none !important; 
        }
        /* 白名单：代码块、行内代码、表格、输入框允许选中，避免影响查阅 */
        pre, code, .vp-doc table, input, textarea { 
          -webkit-user-select: text !important; 
          -moz-user-select: text !important; 
          -ms-user-select: text !important; 
          user-select: text !important; 
        }
      `;
      document.head.appendChild(style);

      // 2. 拦截复制事件：弹出警告并阻止
      document.addEventListener('copy', (e) => {
        // 如果选中的是代码块（属于白名单），就放行，不拦截
        const selection = document.getSelection();
        if (selection && selection.anchorNode) {
          let node = selection.anchorNode;
          // 检查选中的节点是否在 pre 或 code 里面
          if (node.nodeType === 3) node = node.parentNode;
          if (node.closest('pre') || node.closest('code')) {
            return; // 代码块放行
          }
        }

        // 如果选中的是普通正文，强行阻止并报警
        e.preventDefault();
        showWarningToast('🚫 请不要复制哦！本文受版权保护。');
      });

      // 3. 拦截鼠标右键菜单（防止部分人用右键复制）
      document.addEventListener('contextmenu', (e) => {
        // 同样判断是否在代码块中
        let node = e.target;
        if (node.closest('pre') || node.closest('code') || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        showWarningToast('🚫 本站已开启版权保护，请尊重原创。');
      });
    }
  } catch (e) {
    console.error('【版权保护】读取配置失败', e);
  }
})

// 💡 右下角红色警告弹窗
const showWarningToast = (msg) => {
  const oldToast = document.getElementById('copy-warning-toast')
  if (oldToast) oldToast.remove()
  
  const toast = document.createElement('div')
  toast.id = 'copy-warning-toast'
  toast.innerText = msg
  
  toast.style = `
    position: fixed; bottom: 30px; right: 30px;
    background: #a82626; color: #fff;
    padding: 15px 25px; border-radius: 8px;
    z-index: 99999; font-weight: bold; font-size: 15px;
    box-shadow: 0 4px 20px rgba(168, 38, 38, 0.6);
    opacity: 0; transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    pointer-events: none;
    border-left: 4px solid #fff;
  `
  
  document.body.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })
  
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}
</script>

<style>
/* 侧边栏展开按钮的样式 */
.sidebar-expand-btn {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 24px;
  height: 48px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-left: none;
  border-radius: 0 8px 8px 0;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}
</style>