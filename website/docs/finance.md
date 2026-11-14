<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'

const financeData = ref({ items: [], stocks: [] })
const loading = ref(true)
const activeStockSymbol = ref('TMC')
const viewMode = ref('minute') // 'minute', 'month', 'year'
const calcItemIndex = ref(0)
const calcQuantity = ref(1)
const baleInput = ref(100)

let chartInstance = null
let timer = null
let lastMinute = -1 

const getNowTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatPrice = (val) => Number(Number(val).toFixed(2))

const getCacheKey = (symbol, period) => `finance_stock_cache_v2_${symbol}_${period}`

const generateHistory = (basePrice, count, type) => {
  let result = []
  let tempClose = formatPrice(basePrice)
  const now = new Date()
  
  for (let i = count - 1; i >= 0; i--) {
    let dateStr = ''
    if (type === 'minute') {
      const time = new Date(now.getTime() - i * 60000)
      dateStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (type === 'day') {
      const time = new Date(now.getTime() - i * 86400000)
      dateStr = `${time.getMonth()+1}/${time.getDate()}`
    } else if (type === 'month') {
      const time = new Date(now.getFullYear(), now.getMonth() - i, 1)
      dateStr = `${time.getFullYear()}-${String(time.getMonth()+1).padStart(2, '0')}`
    }

    const open = tempClose
    const volatility = type === 'minute' ? 0.02 : type === 'day' ? 0.05 : 0.15
    const highest = formatPrice(open * (1 + Math.random() * volatility))
    const lowest = formatPrice(open * (1 - Math.random() * volatility))
    const close = formatPrice(lowest + Math.random() * (highest - lowest))
    
    result.push({ date: dateStr, open, close, highest, lowest })
    tempClose = close
  }
  return result
}

const initStockPeriods = (stock) => {
  const periods = ['minute', 'day', 'month']
  
  periods.forEach(period => {
    const cacheKey = getCacheKey(stock.symbol, period)
    const cachedStr = localStorage.getItem(cacheKey)
    let history = null

    if (cachedStr) {
      try { history = JSON.parse(cachedStr) } catch (e) {}
    }

    if (period === 'minute' && history && history.length !== 30) {
      history = null
    }

    if (!history || !Array.isArray(history) || history.length === 0) {
      if (period === 'minute') history = generateHistory(stock.basePrice || 100, 30, 'minute')
      if (period === 'day') history = generateHistory(stock.basePrice || 100, 30, 'day')
      if (period === 'month') history = generateHistory(stock.basePrice || 100, 24, 'month')
      
      localStorage.setItem(cacheKey, JSON.stringify(history))
    }

    if (period === 'minute') {
      stock.historyMinute = history
      stock.currentPrice = history[history.length - 1].close
    }
    if (period === 'day') stock.historyDay = history
    if (period === 'month') stock.historyMonth = history
  })
}

const startMarketSimulation = () => {
  const now = new Date()
  lastMinute = now.getHours() * 60 + now.getMinutes()

  timer = setInterval(() => {
    if (viewMode.value === 'minute') {
      const stock = financeData.value.stocks.find(s => s.symbol === activeStockSymbol.value)
      if (stock && stock.historyMinute) {
        const currentCandle = stock.historyMinute[stock.historyMinute.length - 1]
        const volatility = 0.002 
        const change = currentCandle.close * (Math.random() * volatility * 2 - volatility)
        let newPrice = formatPrice(currentCandle.close + change)
        if (newPrice < 1) newPrice = 1.00

        currentCandle.close = newPrice
        currentCandle.highest = Math.max(currentCandle.highest, newPrice)
        currentCandle.lowest = Math.min(currentCandle.lowest, newPrice)
        stock.currentPrice = newPrice

        const currentMinute = new Date().getHours() * 60 + new Date().getMinutes()
        if (currentMinute > lastMinute) {
          stock.historyMinute.push({
            date: getNowTime(), open: newPrice, close: newPrice, highest: newPrice, lowest: newPrice
          })
          if (stock.historyMinute.length > 30) stock.historyMinute.shift()
          lastMinute = currentMinute
        }
        
        localStorage.setItem(getCacheKey(stock.symbol, 'minute'), JSON.stringify(stock.historyMinute))
        renderChart()
      }
    }
  }, 1000) 
}

const handleResize = () => {
  if (chartInstance) chartInstance.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  setTimeout(() => { loading.value = false }, 100)

  fetch('/finance.json')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && data.items) {
        financeData.value = data
        if (data.stocks && data.stocks.length > 0) {
          activeStockSymbol.value = data.stocks[0].symbol
        }
      }
      
      const validSymbols = financeData.value.stocks.map(s => s.symbol)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('finance_stock_cache_v2_')) {
          const parts = key.split('_')
          const symbol = parts[4]
          if (!validSymbols.includes(symbol)) {
            localStorage.removeItem(key)
            i-- 
          }
        }
      }

      financeData.value.stocks.forEach(stock => {
        if (!stock.history || stock.history.length === 0) {
          ['minute', 'day', 'month'].forEach(p => localStorage.removeItem(getCacheKey(stock.symbol, p)))
        }
        initStockPeriods(stock)
      })
      
      const script = document.createElement('script')
      script.src = 'https://cdn.bootcdn.net/ajax/libs/echarts/5.5.0/echarts.min.js'
      script.onload = () => {
        setTimeout(() => { renderChart() }, 200)
        startMarketSimulation()
      }
      document.head.appendChild(script)
    })
    .catch(err => {
      console.warn("读取后台数据失败", err)
      loading.value = false
    })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (timer) clearInterval(timer)
  if (chartInstance) chartInstance.dispose()
})

const renderChart = () => {
  const chartDom = document.getElementById('market-chart')
  if (!chartDom || typeof echarts === 'undefined') return
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartDom, 'dark')
  }
  
  const activeStock = financeData.value.stocks.find(s => s.symbol === activeStockSymbol.value) || financeData.value.stocks[0]
  let targetHistory = []
  
  if (viewMode.value === 'minute') targetHistory = activeStock.historyMinute
  else if (viewMode.value === 'month') targetHistory = activeStock.historyDay
  else if (viewMode.value === 'year') targetHistory = activeStock.historyMonth

  const dates = targetHistory?.map(h => h.date) || []
  const kData = targetHistory?.map(h => [h.open, h.close, h.lowest, h.highest]) || []

  const titleMap = { minute: '分时走势', month: '月线走势', year: '年线走势' }

  const option = {
    backgroundColor: 'transparent',
    title: { text: titleMap[viewMode.value] + ' (贝勒)', textStyle: { color: '#fff', fontSize: 16 } },
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: function (params) {
        const p = params[0];
        const data = p.data; 
        return `
          <div style="font-weight:bold; margin-bottom: 5px;">${p.name}</div>
          <div>开盘：${Number(data[0]).toFixed(2)}</div>
          <div>收盘：${Number(data[1]).toFixed(2)}</div>
          <div>最低：${Number(data[2]).toFixed(2)}</div>
          <div>最高：${Number(data[3]).toFixed(2)}</div>
        `;
      }
    },
    xAxis: { 
      type: 'category', 
      data: dates, 
      axisLabel: { color: '#888' },
      boundaryGap: true 
    },
    yAxis: { 
      type: 'value', 
      scale: true, 
      axisLabel: { color: '#888', formatter: (value) => value.toFixed(2) },
      splitLine: { lineStyle: { color: '#333' } }
    },
    series: [{
      type: 'candlestick',
      data: kData,
      itemStyle: {
        color: '#ef232a',       
        color0: '#14b143',      
        borderColor: '#ef232a',
        borderColor0: '#14b143'
      },
      animation: false
    }]
  }
  chartInstance.setOption(option, true) 
}

watch([activeStockSymbol, viewMode], () => {
  renderChart()
  nextTick(() => {
    if (chartInstance) chartInstance.resize()
  })
})

const calcTotal = computed(() => {
  if (!financeData.value.items[calcItemIndex.value]) return 0
  return (financeData.value.items[calcItemIndex.value].price * calcQuantity.value).toFixed(2)
})

// 💡 只保留了黄金换算，移除了股票相关的计算属性
const baleToGold = computed(() => (baleInput.value / 30).toFixed(2))
</script>

# 💰 金融中心

<div v-if="loading" style="text-align: center; color: #888; padding: 50px;">正在接入星网交易所...</div>

<div v-else class="finance-container">
<div class="market-section">
<div class="stock-tabs" style="margin-bottom: 15px;">
<button v-for="s in financeData.stocks" :key="s.symbol" class="stock-tab" :class="{ active: activeStockSymbol === s.symbol }" @click="activeStockSymbol = s.symbol">
{{ s.name }} ({{ (s.currentPrice || 100).toFixed(2) }})
</button>
</div>

<!-- 周期切换栏 -->
<div style="display: flex; align-items: center; background: #1e1e1e; padding: 5px 10px; border-radius: 8px; border: 1px solid #333;">
  <div style="display: flex; gap: 5px;">
    <button class="mode-btn" :class="{ active: viewMode === 'minute' }" @click="viewMode = 'minute'">分时</button>
    <button class="mode-btn" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月线</button>
    <button class="mode-btn" :class="{ active: viewMode === 'year' }" @click="viewMode = 'year'">年线</button>
  </div>
</div>

<div id="market-chart" style="width: 100%; height: 400px; margin-top: 15px;"></div>
<div style="text-align: right; font-size: 12px; color: #666; margin-top: 10px;">
  * 在分时模式下，数据将每秒跳动、每分钟推演新K线。走势已启用本地缓存。
</div>
</div>

<div class="tools-grid">
<div class="tool-card">
<h3>🍞 物价计算器</h3>
<div class="form-row">
<label>选择物品</label>
<select v-model="calcItemIndex">
<option v-for="(item, i) in financeData.items" :key="i" :value="i">{{ item.name }} ({{ item.price }} 贝勒)</option>
</select>
</div>
<div class="form-row">
<label>购买数量</label>
<input type="number" v-model.number="calcQuantity" min="1" />
</div>
<div class="result-box">总价：<span>{{ calcTotal }}</span> 贝勒</div>
</div>

<!-- 💡 汇率换算器：已删除股票部分 -->
<div class="tool-card">
<h3>💱 汇率换算器</h3>
<div class="form-row">
<label>输入贝勒金额</label>
<input type="number" v-model.number="baleInput" min="1" />
</div>
<div class="result-box" style="margin-top: 15px;">
<p>等价黄金：<span>{{ baleToGold }}</span> 克</p>
</div>
</div>
</div>
</div>

<style scoped>
.finance-container { max-width: 1000px; margin: 0 auto; }
.market-section { background: #252526; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 30px; }

.stock-tabs { 
  display: flex; 
  gap: 10px; 
  overflow-x: auto; 
  white-space: nowrap; 
  padding-bottom: 8px; 
}
.stock-tabs::-webkit-scrollbar { height: 6px; }
.stock-tabs::-webkit-scrollbar-track { background: #1e1e1e; border-radius: 3px; }
.stock-tabs::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.stock-tabs::-webkit-scrollbar-thumb:hover { background: #555; }

.stock-tab { background: #1e1e1e; border: 1px solid #444; color: #aaa; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.stock-tab.active { background: rgba(14, 99, 156, 0.2); border-color: #0e639c; color: #fff; font-weight: bold; }
.stock-tab:hover { color: #fff; }

.mode-btn { background: transparent; border: none; color: #888; font-size: 14px; padding: 5px 15px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-weight: bold; }
.mode-btn:hover { color: #fff; background: #333; }
.mode-btn.active { background: #0e639c; color: #fff; }

.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.tool-card { background: #252526; border: 1px solid #333; border-radius: 12px; padding: 20px; }
.tool-card h3 { margin-top: 0; color: #fff; border-bottom: 1px solid #444; padding-bottom: 10px; }
.form-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.form-row label { color: #aaa; }
.form-row input, .form-row select { background: #1e1e1e; border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 6px; width: 200px; outline: none; }
.form-row input:focus, .form-row select:focus { border-color: #0e639c; }
.result-box { background: #1e1e1e; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; color: #fff; border: 1px dashed #555; margin-top: 20px; }
.result-box span { color: #0e639c; font-weight: bold; font-size: 24px; }
.result-box p { margin: 5px 0; font-size: 15px; }
@media (max-width: 768px) { .tools-grid { grid-template-columns: 1fr; } }
</style>