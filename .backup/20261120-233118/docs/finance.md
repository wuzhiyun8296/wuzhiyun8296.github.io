<!-- 文件路径: website/docs/finance.md -->
<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'

const financeData = ref({ items: [], stocks: [], currencies: [] })
const loading = ref(true)

const activeTab = ref('stock') 
const activeSymbol = ref('')
const viewMode = ref('minute') 
const calcItemIndex = ref(0)
const calcQuantity = ref(1)

const fromCurrency = ref('')
const toCurrency = ref('')
const exchangeAmount = ref(1)

let chartInstance = null
let timer = null
let lastMinute = -1 

const getNowTime = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const formatPrice = (val) => Number(Number(val).toFixed(2))
const getCacheKey = (symbol, period) => `finance_market_v20_${symbol}_${period}`

const baseCurrencyName = computed(() => {
  return financeData.value.currencies[0]?.name || '黄金'
})

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
    const volatility = type === 'minute' ? 0.003 : type === 'day' ? 0.03 : 0.08
    const highest = formatPrice(open * (1 + Math.random() * volatility))
    const lowest = formatPrice(open * (1 - Math.random() * volatility))
    const close = formatPrice(lowest + Math.random() * (highest - lowest))
    
    result.push({ date: dateStr, open, close, highest, lowest })
    tempClose = close
  }
  return result
}

const initMarketPeriods = (asset) => {
  ['minute', 'day', 'month'].forEach(period => {
    const cacheKey = getCacheKey(asset.symbol, period)
    const cachedStr = localStorage.getItem(cacheKey)
    let history = cachedStr ? JSON.parse(cachedStr) : null

    if (period === 'minute' && history && history.length !== 30) history = null

    if (!history || !Array.isArray(history) || history.length === 0) {
      const base = Number(asset.basePrice) || 0.1
      if (period === 'minute') history = generateHistory(base, 30, 'minute')
      if (period === 'day') history = generateHistory(base, 30, 'day')
      if (period === 'month') history = generateHistory(base, 24, 'month')
      localStorage.setItem(cacheKey, JSON.stringify(history))
    }

    if (period === 'minute') {
      asset.historyMinute = history
      const targetPrice = Number(asset.currentPrice !== undefined ? asset.currentPrice : asset.basePrice)
      const lastCandle = history[history.length - 1]
      if (lastCandle && Math.abs(lastCandle.close - targetPrice) > 0.001) {
        lastCandle.close = targetPrice
        lastCandle.highest = Math.max(lastCandle.highest, targetPrice)
        lastCandle.lowest = Math.min(lastCandle.lowest, targetPrice)
      }
      asset.currentPrice = targetPrice
    }
    if (period === 'day') asset.historyDay = history
    if (period === 'month') asset.historyMonth = history
  })
}

const startMarketSimulation = () => {
  const now = new Date()
  lastMinute = now.getHours() * 60 + now.getMinutes()

  timer = setInterval(() => {
    if (viewMode.value === 'minute') {
      const assets = activeTab.value === 'stock' ? financeData.value.stocks : financeData.value.currencies
      
      assets.forEach((activeAsset, index) => {
        if (activeTab.value === 'currency' && index === 0) return;

        if (activeAsset && activeAsset.historyMinute && activeAsset.historyMinute.length > 0) {
          const currentCandle = activeAsset.historyMinute[activeAsset.historyMinute.length - 1]
          const volatility = activeTab.value === 'stock' ? 0.0008 : 0.002 
          const revertForce = (activeAsset.basePrice - currentCandle.close) * 0.005;
          const noise = currentCandle.close * (Math.random() * volatility * 2 - volatility);
          
          let newPrice = formatPrice(currentCandle.close + revertForce + noise)
          if (newPrice < 0.01) newPrice = 0.01

          currentCandle.close = newPrice
          currentCandle.highest = Math.max(currentCandle.highest, newPrice)
          currentCandle.lowest = Math.min(currentCandle.lowest, newPrice)
          activeAsset.currentPrice = newPrice

          const currentMinute = new Date().getHours() * 60 + new Date().getMinutes()
          if (currentMinute > lastMinute) {
            activeAsset.historyMinute.push({ date: getNowTime(), open: newPrice, close: newPrice, highest: newPrice, lowest: newPrice })
            if (activeAsset.historyMinute.length > 30) activeAsset.historyMinute.shift()
          }
          localStorage.setItem(getCacheKey(activeAsset.symbol, 'minute'), JSON.stringify(activeAsset.historyMinute))
        }
      });
      
      const currentMinute = new Date().getHours() * 60 + new Date().getMinutes()
      if (currentMinute > lastMinute) lastMinute = currentMinute;
      renderChart()
    }
  }, 1000) 
}

const handleResize = () => { 
  if (chartInstance) chartInstance.resize() 
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  
  fetch('/finance.json?t=' + Date.now())
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        financeData.value = {
          items: data.items || [],
          stocks: data.stocks || [],
          currencies: data.currencies || []
        }
        
        if (financeData.value.stocks.length > 0) activeSymbol.value = financeData.value.stocks[0].symbol
        
        if (financeData.value.currencies.length > 0) {
          fromCurrency.value = financeData.value.currencies[0].symbol;
          toCurrency.value = financeData.value.currencies[1]?.symbol || financeData.value.currencies[0].symbol;
        }
        
        const allAssets = [...financeData.value.stocks, ...financeData.value.currencies];
        allAssets.forEach(initMarketPeriods);
      }
      loading.value = false
      
      const script = document.createElement('script')
      script.src = 'https://cdn.bootcdn.net/ajax/libs/echarts/5.5.0/echarts.min.js'
      script.onload = () => {
        setTimeout(() => { renderChart() }, 200)
        startMarketSimulation()
      }
      document.head.appendChild(script)
    })
    .catch(err => { console.warn("读取后台数据失败", err); loading.value = false })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (timer) clearInterval(timer)
  if (chartInstance) chartInstance.dispose()
})

const renderChart = () => {
  const chartDom = document.getElementById('market-chart')
  if (!chartDom || typeof echarts === 'undefined') return
  
  if (!chartInstance) chartInstance = echarts.init(chartDom, 'dark')
  
  const assets = activeTab.value === 'stock' ? financeData.value.stocks : financeData.value.currencies
  const activeAsset = assets.find(s => s.symbol === activeSymbol.value) || assets[0]
  
  if (!activeAsset) {
    chartInstance.clear()
    chartDom.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#666;font-size:14px;">暂无数据</div>`
    return
  } else {
    if(chartDom.innerHTML.includes('暂无数据')) chartDom.innerHTML = ''
  }

  let targetHistory = []
  if (viewMode.value === 'minute') targetHistory = activeAsset.historyMinute
  else if (viewMode.value === 'month') targetHistory = activeAsset.historyDay
  else if (viewMode.value === 'year') targetHistory = activeAsset.historyMonth

  const dates = targetHistory?.map(h => h.date) || []
  const kData = targetHistory?.map(h => [h.open, h.close, h.lowest, h.highest]) || []
  const titleMap = { minute: '分时走势', month: '月线走势', year: '年线走势' }
  const unit = activeTab.value === 'stock' ? '贝勒' : baseCurrencyName.value

  // 💡 移动端判断
  const isMobile = window.innerWidth < 768

  const option = {
    backgroundColor: 'transparent',
    title: { 
      text: `${titleMap[viewMode.value]} (${unit})`, 
      textStyle: { color: '#fff', fontSize: isMobile ? 14 : 16 },
      left: 'center'
    },
    // 💡 移动端适配：给 Y 轴留足空间，防止数字被切掉
    grid: { 
      left: isMobile ? '15%' : '8%', 
      right: isMobile ? '8%' : '5%', 
      bottom: '15%', 
      top: '20%' 
    },
    tooltip: { 
      trigger: 'axis', axisPointer: { type: 'cross' },
      formatter: function (params) {
        const p = params[0]; const data = p.data; 
        return `
          <div style="font-weight:bold; margin-bottom: 5px; font-size: 12px;">${p.name}</div>
          <div style="font-size: 12px;">开盘：${Number(data[0]).toFixed(2)}</div>
          <div style="font-size: 12px;">收盘：${Number(data[1]).toFixed(2)}</div>
          <div style="font-size: 12px;">最低：${Number(data[2]).toFixed(2)}</div>
          <div style="font-size: 12px;">最高：${Number(data[3]).toFixed(2)}</div>
        `;
      }
    },
    xAxis: { 
      type: 'category', 
      data: dates, 
      axisLabel: { color: '#888', fontSize: isMobile ? 10 : 12 }, 
      boundaryGap: true 
    },
    yAxis: { 
      type: 'value', 
      scale: true, 
      axisLabel: { color: '#888', fontSize: isMobile ? 10 : 12, formatter: (v) => v.toFixed(2) }, 
      splitLine: { lineStyle: { color: '#333' } } 
    },
    series: [{
      type: 'candlestick', data: kData,
      itemStyle: { color: '#ef232a', color0: '#14b143', borderColor: '#ef232a', borderColor0: '#14b143' },
      animation: false
    }]
  }
  chartInstance.setOption(option, true) 
}

watch([activeSymbol, viewMode, activeTab], () => { 
  renderChart(); 
  nextTick(() => { if (chartInstance) chartInstance.resize() }) 
})

const calcTotal = computed(() => {
  if (!financeData.value.items[calcItemIndex.value]) return 0
  return (financeData.value.items[calcItemIndex.value].price * calcQuantity.value).toFixed(2)
})

const exchangeResult = computed(() => {
  if (fromCurrency.value === toCurrency.value) return exchangeAmount.value.toFixed(2)
  
  const fromC = financeData.value.currencies.find(c => c.symbol === fromCurrency.value)
  const toC = financeData.value.currencies.find(c => c.symbol === toCurrency.value)
  
  if (!fromC || !toC) return 0
  
  const result = exchangeAmount.value * (fromC.currentPrice / toC.currentPrice)
  return Number(result.toFixed(2))
})
</script>

# 💰 金融中心

<div v-if="loading" style="text-align: center; color: #888; padding: 50px;">正在接入星网交易所...</div>

<div v-else class="finance-container">
<div class="market-section">
  <div class="main-tabs">
    <div class="tab-buttons">
      <button :class="{ active: activeTab === 'stock' }" @click="activeTab = 'stock'; activeSymbol = financeData.stocks[0]?.symbol">📈 股票市场</button>
      <button :class="{ active: activeTab === 'currency' }" @click="activeTab = 'currency'; activeSymbol = financeData.currencies[0]?.symbol">💱 金本位外汇</button>
    </div>
    <div class="live-indicator">
      <span class="live-dot"></span> 实时交易中
    </div>
  </div>

  <!-- 允许横向滚动，防止标签被挤压 -->
  <div class="stock-tabs">
    <template v-if="activeTab === 'stock'">
      <button v-for="s in financeData.stocks" :key="s.symbol" class="stock-tab" :class="{ active: activeSymbol === s.symbol }" @click="activeSymbol = s.symbol">
        {{ s.name }} ({{ (s.currentPrice || 100).toFixed(2) }})
      </button>
    </template>
    <template v-else>
      <button v-for="c in financeData.currencies" :key="c.symbol" class="stock-tab" :class="{ active: activeSymbol === c.symbol }" @click="activeSymbol = c.symbol">
        {{ c.name }} ({{ (c.currentPrice || 1).toFixed(2) }})
      </button>
    </template>
  </div>

  <div class="mode-switches">
    <button class="mode-btn" :class="{ active: viewMode === 'minute' }" @click="viewMode = 'minute'">分时</button>
    <button class="mode-btn" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月线</button>
    <button class="mode-btn" :class="{ active: viewMode === 'year' }" @click="viewMode = 'year'">年线</button>
  </div>

  <div id="market-chart"></div>
</div>

<div class="tools-grid">
  <div class="tool-card">
    <h3>🍞 物价计算器</h3>
    <div class="form-row">
      <label>选择物品</label>
      <select v-model="calcItemIndex">
        <option v-for="(item, i) in financeData.items" :key="i" :value="i">{{ item.name }} ({{ item.price }} 金币)</option>
      </select>
    </div>
    <div class="form-row">
      <label>购买数量</label>
      <input type="number" v-model.number="calcQuantity" min="1" />
    </div>
    <div class="result-box">总价：<span>{{ calcTotal }}</span> 金币</div>
  </div>

  <div class="tool-card">
    <h3>💱 汇率交叉兑换器</h3>
    <div class="form-row">
      <label>持有货币</label>
      <select v-model="fromCurrency">
        <option v-for="c in financeData.currencies" :key="c.symbol" :value="c.symbol">
          {{ c.name }}
        </option>
      </select>
    </div>
    <div class="form-row">
      <label>目标货币</label>
      <select v-model="toCurrency">
        <option v-for="c in financeData.currencies" :key="c.symbol" :value="c.symbol">
          {{ c.name }}
        </option>
      </select>
    </div>
    <div class="form-row">
      <label>兑换金额</label>
      <input type="number" v-model.number="exchangeAmount" min="1" />
    </div>
    <div class="result-box" style="margin-top: 15px;">
      <p>可兑换：<span>{{ exchangeResult }}</span> 
        {{ financeData.currencies.find(c => c.symbol === toCurrency)?.name || toCurrency }}
      </p>
    </div>
  </div>
</div>
</div>

<style scoped>
/* PC 端基础样式 */
.finance-container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
.market-section { background: #252526; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 30px; }

.main-tabs { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.tab-buttons { display: flex; gap: 10px; }
.main-tabs button { background: transparent; border: none; color: #888; font-size: 18px; font-weight: bold; cursor: pointer; padding: 5px 10px; transition: 0.2s; }
.main-tabs button:hover { color: #fff; }
.main-tabs button.active { color: #0e639c; border-bottom: 2px solid #0e639c; }
.live-indicator { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #2ea043; }

.stock-tabs { display: flex; gap: 10px; overflow-x: auto; white-space: nowrap; padding-bottom: 8px; margin-bottom: 15px; }
.stock-tabs::-webkit-scrollbar { height: 6px; }
.stock-tabs::-webkit-scrollbar-track { background: #1e1e1e; border-radius: 3px; }
.stock-tabs::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.stock-tab { background: #1e1e1e; border: 1px solid #444; color: #aaa; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; font-size: 14px; }
.stock-tab.active { background: rgba(14, 99, 156, 0.2); border-color: #0e639c; color: #fff; font-weight: bold; }
.stock-tab:hover { color: #fff; }

.mode-switches { display: flex; align-items: center; background: #1e1e1e; padding: 5px 10px; border-radius: 8px; border: 1px solid #333; width: fit-content; margin-bottom: 15px; }
.mode-btn { background: transparent; border: none; color: #888; font-size: 14px; padding: 5px 15px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-weight: bold; }
.mode-btn:hover { color: #fff; background: #333; }
.mode-btn.active { background: #0e639c; color: #fff; }

#market-chart { width: 100%; height: 400px; }

.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.tool-card { background: #252526; border: 1px solid #333; border-radius: 12px; padding: 20px; }
.tool-card h3 { margin-top: 0; color: #fff; border-bottom: 1px solid #444; padding-bottom: 10px; }
.form-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
.form-row label { color: #aaa; }
.form-row input, .form-row select { background: #1e1e1e; border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 6px; width: 200px; outline: none; max-width: 100%; }
.form-row input:focus, .form-row select:focus { border-color: #0e639c; }
.result-box { background: #1e1e1e; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; color: #fff; border: 1px dashed #555; margin-top: 20px; word-break: break-all; }
.result-box span { color: #0e639c; font-weight: bold; font-size: 24px; }
.result-box p { margin: 5px 0; font-size: 15px; }

.live-dot { display: inline-block; width: 8px; height: 8px; background-color: #2ea043; border-radius: 50%; box-shadow: 0 0 8px #2ea043; animation: breathe 1.5s infinite ease-in-out; }
@keyframes breathe { 0% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.4; transform: scale(0.8); } }

/* =========================================
   💡 移动端专属适配
   ========================================= */
@media (max-width: 768px) {
  .finance-container { padding: 0 10px; }
  .market-section { padding: 15px; }
  
  .main-tabs { flex-direction: column; align-items: flex-start; gap: 15px; }
  .live-indicator { margin-left: 0; align-self: flex-end; }
  
  .stock-tab { font-size: 13px; padding: 6px 12px; }
  
  /* 手机端图表高度稍微降低，给下面工具留空间 */
  #market-chart { height: 300px; }

  .tools-grid { grid-template-columns: 1fr; gap: 15px; }
  .form-row { flex-direction: column; align-items: flex-start; gap: 5px; }
  .form-row input, .form-row select { width: 100%; }
  
  .result-box { font-size: 16px; padding: 10px; }
  .result-box span { font-size: 20px; }
}
</style>