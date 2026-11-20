---
layout: home
aside: false
outline: false

hero:
  name: "幻想域"
  text: "The Veiled Kindred Spirits"
  tagline: "当物理与魔法交织，帝国的齿轮在暗中转动。"
  actions:
    - theme: brand
      text: "探索世界"
      link: "/world-navigation"
    - theme: alt
      text: "查看编年史"
      link: "/timeline"
features:
  - title: "帝国商贸法典"
    details: "规范帝国境内一切商业活动，贝勒（Bale）为唯一法定货币，由十二圆桌骑士共同监管。"
  - title: "魔法与物理"
    details: "拥有魔力者方能施展魔法，而穿越者对此免疫。在阶级固化的世界里，反抗的种子正在发芽。"
  - title: "幻想域联盟"
    details: "穿越者组成的秘密联盟，致力于推翻帝国统治，建立一个人魔共存的理想国。"
---

<section class="home-section">
  <h2 class="home-heading">世界导览</h2>
  <p class="home-lead">六个入口，通往幻想域的每一处角落。</p>
  <div class="home-grid">
    <a class="home-card" href="/world-navigation">
      <span class="home-card-icon">🌍</span>
      <span class="home-card-body">
        <span class="home-card-name">世界观树</span>
        <span class="home-card-desc">帝国、教会与联盟的设定总纲，按层级逐层展开。</span>
      </span>
    </a>
    <a class="home-card" href="/timeline">
      <span class="home-card-icon">⏳</span>
      <span class="home-card-body">
        <span class="home-card-name">幻想域编年史</span>
        <span class="home-card-desc">按时间轴梳理的纪元更迭与帝国大事记。</span>
      </span>
    </a>
    <a class="home-card" href="/characters">
      <span class="home-card-icon">👤</span>
      <span class="home-card-body">
        <span class="home-card-name">人物档案</span>
        <span class="home-card-desc">各阵营核心成员的档案、立绘与生平。</span>
      </span>
    </a>
    <a class="home-card" href="/graph">
      <span class="home-card-icon">🕸️</span>
      <span class="home-card-body">
        <span class="home-card-name">关系图谱</span>
        <span class="home-card-desc">拖拽式查看人物与势力之间错综复杂的暗线。</span>
      </span>
    </a>
    <a class="home-card" href="/map">
      <span class="home-card-icon">🗺️</span>
      <span class="home-card-body">
        <span class="home-card-name">世界地图</span>
        <span class="home-card-desc">大陆诸国、战略要冲与地标的交互式地图。</span>
      </span>
    </a>
    <a class="home-card" href="/finance">
      <span class="home-card-icon">💰</span>
      <span class="home-card-body">
        <span class="home-card-name">金融中心</span>
        <span class="home-card-desc">实时物价、货币汇率与股市波动的推演沙盘。</span>
      </span>
    </a>
  </div>
</section>
<section class="home-section">
  <h2 class="home-heading">三条入门路线</h2>
  <p class="home-lead">第一次来到幻想域，可以任选一条线开始。</p>
  <div class="home-route-grid">
    <div class="home-route">
      <div class="home-route-step">01</div>
      <div class="home-route-name">新读者路线</div>
      <p class="home-route-desc">世界观树 → 编年史 → 正文第一章。先建立地理与历史坐标，再进入故事。</p>
      <a class="home-route-link" href="/world-navigation">从世界观树开始 →</a>
    </div>
    <div class="home-route">
      <div class="home-route-step">02</div>
      <div class="home-route-name">人物志路线</div>
      <p class="home-route-desc">人物档案 → 关系图谱 → 挑一个角色追到底。看清谁在借谁的手。</p>
      <a class="home-route-link" href="/characters">从人物档案开始 →</a>
    </div>
    <div class="home-route">
      <div class="home-route-step">03</div>
      <div class="home-route-name">商道与魔法路线</div>
      <p class="home-route-desc">帝国商贸法典 → 金融中心 → 看一场没有硝烟的经济战。</p>
      <a class="home-route-link" href="/finance">从金融中心开始 →</a>
    </div>
  </div>
</section>
<a class="home-entry" href="/navigation">
  <span class="home-entry-icon">🧭</span>
  <span class="home-entry-body">
    <span class="home-entry-name">快捷导航中心</span>
    <span class="home-entry-desc">工具与交互页面的总入口，人物、地图、金融等模块都在这里。</span>
  </span>
  <span class="home-entry-go">进入 →</span>
</a>

<style scoped>
/* ---------- 版式基础 ---------- */
.home-section {
  margin-top: 64px;
}

.home-heading {
  margin: 0 0 8px;
  padding-top: 0;
  border-top: none;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  color: var(--vp-c-text-1);
}

.home-heading .header-anchor {
  display: none;
}

.home-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
  color: var(--vp-c-text-3);
}

/* ---------- 导览卡片 ---------- */
.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.home-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease, background-color 0.18s ease;
}

.home-card:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
}

.home-card-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  font-size: 20px;
  line-height: 1;
}

.home-card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.home-card-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.home-card-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

/* ---------- 入门路线 ---------- */
.home-route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.home-route {
  position: relative;
  padding: 20px 22px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.18s ease;
}

.home-route:hover {
  border-color: var(--vp-c-brand-1);
}

.home-route-step {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--vp-c-brand-1);
}

.home-route-name {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.home-route-desc {
  margin: 8px 0 14px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.home-route-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.home-route-link:hover {
  text-decoration: underline;
}

/* ---------- 导航页入口 ---------- */
.home-entry {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 56px;
  padding: 18px 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.home-entry:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
}

.home-entry-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  font-size: 20px;
  line-height: 1;
}

.home-entry-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.home-entry-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.home-entry-desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.home-entry-go {
  flex: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .home-section {
    margin-top: 48px;
  }
  .home-heading {
    font-size: 20px;
  }
  .home-grid,
  .home-route-grid {
    grid-template-columns: 1fr;
  }
}
</style>
