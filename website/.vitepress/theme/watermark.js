// 文件路径: website/.vitepress/theme/watermark.js
// 🔐 版权水印：零宽字符（隐形）+ 可见叠层 + 复制溯源
//
// 设计目标：
//   1. 页面被「抓包」拿到 HTML —— 渲染后每个段落末尾都会补上零宽水印，还原正文就会带走水印；
//   2. 被 OCR / 截图 —— 铺一层极淡的可见水印，识别后仍能看出出处；
//   3. 被复制粘贴 —— 剪贴板里追加一行来源声明，且文本自带零宽水印。

const ZW0 = '\u200b';   // 0
const ZW1 = '\u200c';   // 1
const ZW_SEP = '\u2060'; // 分隔符（word joiner，肉眼不可见）

// 把字符串编成零宽字符序列（UTF-8 → base64 → 位）
function encodeZeroWidth(text) {
  let b64 = '';
  try {
    b64 = btoa(unescape(encodeURIComponent(text)));
  } catch (e) {
    b64 = String(text);
  }
  let out = ZW_SEP;
  for (let i = 0; i < b64.length; i++) {
    const code = b64.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      out += (code >> bit) & 1 ? ZW1 : ZW0;
    }
  }
  return out + ZW_SEP;
}

// 反向：从任意文本里取出零宽水印并还原
export function decodeZeroWidth(text) {
  const cleaned = String(text || '').replace(/[^\u200b\u200c\u2060]/g, '');
  if (!cleaned) return '';
  const parts = cleaned.split(ZW_SEP).filter((s) => s.length >= 8);
  const results = [];
  for (const part of parts) {
    let bin = '';
    for (const ch of part) bin += ch === ZW1 ? '1' : '0';
    let b64 = '';
    for (let i = 0; i + 8 <= bin.length; i += 8) {
      b64 += String.fromCharCode(parseInt(bin.slice(i, i + 8), 2));
    }
    try {
      const decoded = decodeURIComponent(escape(atob(b64)));
      if (decoded) results.push(decoded);
    } catch (e) { /* 不是有效水印，跳过 */ }
  }
  return results[0] || '';
}

// 生成可见水印文字（带时间，截图/OCR 泄露后能定位到哪一天）
function buildVisibleText(cfg, chapter) {
  const who = cfg.authorName || '本站作者';
  const site = cfg.watermarkSite || (typeof location !== 'undefined' ? location.host : '');
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${who}${site ? ' · ' + site : ''}${chapter ? ' · ' + chapter : ''} · ${stamp}`;
}

// 把可见水印铺成一层（截图能看见极淡的字，OCR 后仍可辨识出处）
function paintVisibleLayer(cfg, chapter) {
  if (!cfg.enableVisibleWatermark) return;
  if (document.getElementById('mw-watermark-layer')) return;

  const text = buildVisibleText(cfg, chapter);
  const opacity = typeof cfg.watermarkOpacity === 'number' ? cfg.watermarkOpacity : 0.05;

  const layer = document.createElement('div');
  layer.id = 'mw-watermark-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `
    position: fixed; inset: 0; z-index: 3; pointer-events: none;
    overflow: hidden; opacity: ${opacity};
    display: grid; grid-template-columns: repeat(3, 1fr);
    align-content: space-around; justify-items: center;
  `;

  for (let i = 0; i < 24; i++) {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.cssText = `
      transform: rotate(-22deg);
      font-size: 15px; white-space: nowrap;
      color: var(--vp-c-text-2, #888);
      user-select: none;
    `;
    layer.appendChild(span);
  }
  document.body.appendChild(layer);
}

// 往正文段落里塞零宽水印
function injectZeroWidth(cfg, chapter) {
  if (!cfg.enableWatermark) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = `MW1|${cfg.authorName || 'anon'}|${cfg.watermarkSite || ''}|${chapter || ''}|${stamp}`;
  const zw = encodeZeroWidth(payload);

  const blocks = document.querySelectorAll('.novel-chapter .vp-doc > p, .novel-chapter .vp-doc > div > p');
  blocks.forEach((el, i) => {
    if (el.dataset.mwMarked) return;
    // 交替放在段末 / 段首，部分复制也能带走水印
    if (i % 2 === 0) {
      el.appendChild(document.createTextNode(zw));
    } else {
      el.insertBefore(document.createTextNode(zw), el.firstChild);
    }
    el.dataset.mwMarked = '1';
  });
}

// 复制时追加来源声明（默认"留痕"，只有开启"禁止复制"才封死）
function hookCopy(cfg, chapter) {
  const mode = cfg.enableAntiCopy ? 'block' : (cfg.copyMode || 'mark');
  if (mode === 'none') return;
  document.addEventListener('copy', (e) => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    if (!text.trim() && mode !== 'block') return;

    const who = cfg.authorName || '本站作者';
    const site = cfg.watermarkSite || '';
    const note = (cfg.copyrightText || `本文摘自《${who}》的作品，请支持正版。`)
      + (site ? `（来源：${site}）` : '')
      + (chapter ? ` · ${chapter}` : '');

    // 💡 复制内容里再补一份零宽水印：
    //    选区可能只覆盖了半句、或者被"禁止复制"模式丢掉正文，
    //    这里兜底保证「只要复制走一行字，就能被水印检测解出来」。
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const zw = encodeZeroWidth(`MW1|${who}|${site}|${chapter || ''}|${stamp}`);

    const body = mode === 'block' ? '' : text;
    e.clipboardData.setData('text/plain', body + zw + '\n\n—— ' + note);
    e.preventDefault();
  });
}

// 入口：由 Layout.vue 在挂载后调用
export async function installWatermark() {
  if (typeof window === 'undefined') return;

  let cfg = {};
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'protection-config.json?t=' + Date.now());
    if (res.ok) cfg = await res.json();
  } catch (e) {
    return; // 拿不到配置就不做任何事
  }
  if (!cfg.enableWatermark && !cfg.enableVisibleWatermark) return;

  const path = decodeURIComponent(location.pathname);
  const m = /\/novel\/chapters\/([^/]+)\/([^/]+?)(?:\.html)?$/.exec(path);
  const chapter = m ? `${m[1]} · ${m[2]}` : '';

  // 页面内容是客户端渲染的，等 DOM 出来再注入
  const run = () => {
    injectZeroWidth(cfg, chapter);
    paintVisibleLayer(cfg, chapter);
  };
  if (document.querySelector('.novel-chapter')) {
    run();
  } else {
    const timer = setInterval(() => {
      if (document.querySelector('.novel-chapter')) {
        clearInterval(timer);
        run();
      }
    }, 300);
    setTimeout(() => clearInterval(timer), 8000);
  }

  hookCopy(cfg, chapter);
}
