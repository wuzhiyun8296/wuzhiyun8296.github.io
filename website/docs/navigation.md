# 🧭 快捷导航与交互中心

这里汇集了幻想域设定集中的独立工具与快捷入口。

<div class="nav-grid">

  <!-- 小说入口 -->
  <a href="/novel/" class="nav-card">
    <div class="nav-icon">📖</div>
    <div class="nav-content">
      <h3>幻想域小说</h3>
      <p>阅读主角穿越后在幻想域的奇妙冒险与故事。</p>
    </div>
  </a>

  <a href="/graph" class="nav-card">
    <div class="nav-icon">🕸️</div>
    <div class="nav-content">
      <h3>关系图谱</h3>
      <p>交互式拖拽查看人物与势力的复杂关系网络。</p>
    </div>
  </a>

  <a href="/characters" class="nav-card">
    <div class="nav-icon">👤</div>
    <div class="nav-content">
      <h3>人物图鉴</h3>
      <p>查看各阵营核心成员的档案与立绘照片。</p>
    </div>
  </a>

  <a href="/timeline" class="nav-card">
    <div class="nav-icon">⏳</div>
    <div class="nav-content">
      <h3>幻想域编年史</h3>
      <p>回顾帝国506年至今的重大历史事件与主线时间线。</p>
    </div>
  </a>

  <a href="/finance" class="nav-card">
    <div class="nav-icon">💰</div>
    <div class="nav-content">
      <h3>金融中心</h3>
      <p>查看实时物价、货币汇率及虚拟股市波动行情。</p>
    </div>
  </a>
  
  <a href="/map" class="nav-card">
    <div class="nav-icon">🗺️</div>
    <div class="nav-content">
      <h3>世界地图</h3>
      <p>交互式查看幻想域大陆的各个国家与地标。</p>
    </div>
  </a>

  <a href="/epoch-map" class="nav-card">
    <div class="nav-icon">🕰️</div>
    <div class="nav-content">
      <h3>纪元演变地图</h3>
      <p>拖动时间轴滑块，动态查看各大势力版图的扩张与覆灭。</p>
    </div>
  </a>
</div>

<style scoped>
.nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
.nav-card { display: flex; align-items: flex-start; gap: 15px; background: var(--vp-c-bg-soft, #252526); padding: 20px; border-radius: 12px; border: 1px solid #333; text-decoration: none !important; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
.nav-card:hover { transform: translateY(-4px); border-color: var(--vp-c-brand-1, #0e639c); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.nav-icon { font-size: 32px; background: #1e1e1e; padding: 10px; border-radius: 10px; border: 1px solid #444; }
.nav-content h3 { margin: 0 0 8px 0; color: #fff; font-size: 16px; border-bottom: none; padding: 0; }
.nav-content p { margin: 0; color: #aaa; font-size: 13px; line-height: 1.5; }
</style>