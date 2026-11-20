<script setup>
import { ref, onMounted, nextTick } from 'vue'

const graphData = ref({ nodes: [], links: [] })
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/public/graph.json')
    if (res.ok) {
      graphData.value = await res.json()
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdn.bootcdn.net/ajax/libs/echarts/5.5.0/echarts.min.js'
    
    script.onload = () => {
      loading.value = false
      nextTick(() => { renderChart() })
    }
    
    document.head.appendChild(script)
    
  } catch (error) {
    console.error("加载图谱失败", error)
    loading.value = false
  }
})

const renderChart = () => {
  const chartDom = document.getElementById('graph-container')
  if (!chartDom || typeof echarts === 'undefined') return
  
  const myChart = echarts.init(chartDom, 'dark')
  
  // 处理分类
  const categories = [...new Set(graphData.value.nodes.map(n => n.category || '默认'))].map(c => ({ name: c }))
  
  // 格式化节点
  const nodes = graphData.value.nodes.map(n => ({
    name: n.name,
    category: categories.findIndex(c => c.name === (n.category || '默认')),
    symbolSize: 60
  }))

  // 格式化连线：将 label 转为 ECharts 认识的 value
  const links = graphData.value.links.map(l => ({
    source: l.source,
    target: l.target,
    value: l.label || '关系'
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: function (params) {
        // 鼠标悬浮时的提示框
        if (params.dataType === 'edge') {
          return `${params.data.source} <b>[${params.data.value}]</b> ${params.data.target}`;
        }
        return params.name;
      }
    },
    legend: [{ data: categories.map(c => c.name), textStyle: { color: '#ccc' }, bottom: 0 }],
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      categories: categories,
      roam: true,
      label: { show: true, position: 'right', color: '#fff', fontSize: 14, fontWeight: 'bold' },
      
      // 调整力导向物理引擎参数，解决挤在一起的问题
      force: { 
        repulsion: 1500,  // 加大节点之间的排斥力
        edgeLength: 250,  // 加长连线
        gravity: 0.1      // 让节点整体向中心靠拢
      },
      
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 10],
      edgeLabel: { 
        show: true, 
        formatter: '{c}', // 读取 link.value
        color: '#aaa', 
        fontSize: 13,
        backgroundColor: 'rgba(30,30,30,0.8)',
        padding: [2, 4],
        borderRadius: 4
      },
      lineStyle: { color: '#555', width: 2, curveness: 0.1 }
    }]
  }
  myChart.setOption(option)
  window.addEventListener('resize', () => myChart.resize())
}
</script>

# 🕸️ 关系图谱

<div v-if="loading" style="text-align: center; color: #888; padding: 50px;">正在绘制图谱...</div>

<!-- 改用 v-if，确保 DOM 具有正确的宽高再初始化 ECharts -->
<div v-if="!loading" id="graph-container" style="width: 100%; height: 750px; background: #1e1e1e; border-radius: 12px; border: 1px solid #333; margin-top: 20px;"></div>