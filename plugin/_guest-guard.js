// 文件路径: plugin/_guest-guard.js
// 访客只读守卫：被 server.js 自动注入到每个插件页面
// 作用：① 顶部横幅 ② 拦截所有写请求 ③ 让编辑区不可编辑
(function () {
  'use strict';

  var GUEST = false;

  // ---------- 样式 ----------
  function injectStyle() {
    if (document.getElementById('dsh-guest-style')) return;
    var css = ''
      + '.dsh-guest-bar{position:fixed;top:0;left:0;right:0;z-index:2147483646;display:flex;align-items:center;gap:10px;'
      + 'padding:8px 14px;background:rgba(210,153,34,.14);border-bottom:1px solid rgba(210,153,34,.4);'
      + 'backdrop-filter:blur(6px);font-family:"Microsoft YaHei",system-ui,sans-serif;font-size:12.5px;color:#e3c98d;}'
      + '.dsh-guest-bar b{color:#f0d08a;}'
      + '.dsh-guest-bar .dsh-guest-dot{width:7px;height:7px;border-radius:50%;background:#d29922;flex:0 0 7px;}'
      + '.dsh-guest-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(10px);z-index:2147483647;'
      + 'background:#262a31;border:1px solid #d29922;color:#f0d08a;padding:10px 18px;border-radius:10px;'
      + 'font-family:"Microsoft YaHei",system-ui,sans-serif;font-size:13px;opacity:0;transition:.25s;pointer-events:none;}'
      + '.dsh-guest-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}'
      + 'html.dsh-guest body{padding-top:34px !important;}'
      + 'html.dsh-guest [contenteditable="true"]{outline:1px dashed rgba(210,153,34,.35);}'
      + 'html.dsh-guest .dsh-guest-disabled{opacity:.45;pointer-events:none;filter:grayscale(.4);}';
    var s = document.createElement('style');
    s.id = 'dsh-guest-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function showBar() {
    // 在后台 iframe 里：外层已经有一条横幅了，别重复显示、也别把内容顶下去
    var embedded = false;
    try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded) return;
    if (document.querySelector('.dsh-guest-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'dsh-guest-bar';
    bar.innerHTML = '<span class="dsh-guest-dot"></span>'
      + '<span>👀 <b>访客模式</b>：这里的一切你都能看，但改动不会被保存哦～</span>';
    (document.body || document.documentElement).appendChild(bar);
  }

  var toastTimer = null;
  function toast(text) {
    var el = document.querySelector('.dsh-guest-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'dsh-guest-toast';
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ---------- 拦截写请求 ----------
  function fakeReadOnlyResponse() {
    var body = JSON.stringify({ success: false, error: '访客是只读模式，不能修改内容', readOnly: true });
    try {
      return new Response(body, { status: 403, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return null;
    }
  }

  function isWrite(method) {
    var m = String(method || 'GET').toUpperCase();
    return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
  }

  function patchFetch() {
    if (!window.fetch || window.fetch.__dshGuest) return;
    var orig = window.fetch;
    var wrapped = function (input, init) {
      var method = (init && init.method) || (input && input.method) || 'GET';
      if (GUEST && isWrite(method)) {
        toast('访客模式：这个改动不会保存');
        var fake = fakeReadOnlyResponse();
        if (fake) return Promise.resolve(fake);
        return Promise.reject(new Error('访客只读'));
      }
      return orig.apply(this, arguments);
    };
    wrapped.__dshGuest = true;
    try { window.fetch = wrapped; } catch (e) {}
  }

  function patchXHR() {
    if (!window.XMLHttpRequest || window.XMLHttpRequest.__dshGuest) return;
    var Orig = window.XMLHttpRequest;
    function Patched() {
      var xhr = new Orig();
      var open = xhr.open;
      xhr.open = function (method) {
        if (GUEST && isWrite(method)) {
          // 假装成功但什么都不发
          setTimeout(function () {
            try {
              Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
              Object.defineProperty(xhr, 'status', { value: 403, configurable: true });
              Object.defineProperty(xhr, 'responseText', { value: '{"success":false,"readOnly":true}', configurable: true });
              if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
              if (typeof xhr.onload === 'function') xhr.onload();
            } catch (e) {}
          }, 0);
          toast('访客模式：这个改动不会保存');
          return;
        }
        return open.apply(xhr, arguments);
      };
      return xhr;
    }
    Patched.__dshGuest = true;
    try { window.XMLHttpRequest = Patched; } catch (e) {}
  }

  // ---------- 编辑区不可编辑 ----------
  function lockEditors() {
    var lock = function (el) {
      if (!el || el.__dshGuestLocked) return;
      el.__dshGuestLocked = true;
      if (el.isContentEditable) el.setAttribute('contenteditable', 'false');
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.readOnly = true;
        el.setAttribute('readonly', 'readonly');
      }
    };
    document.querySelectorAll('[contenteditable="true"], textarea').forEach(lock);
    // 动态出现的编辑区（切页/换章）也锁
    try {
      var mo = new MutationObserver(function () {
        document.querySelectorAll('[contenteditable="true"], textarea').forEach(lock);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  // ---------- 启动 ----------
  function boot() {
    injectStyle();
    patchFetch();
    patchXHR();
    showBar();
    lockEditors();
    // 只有独立打开时才加 class（含顶部留白），iframe 里只锁不占位
    try {
      if (window.self === window.top) document.documentElement.classList.add('dsh-guest');
    } catch (e) { document.documentElement.classList.add('dsh-guest'); }
  }

  // 💡 也支持 ?guest=1 强制只读（后台 iframe 会带上这个参数，便于调试）
  try {
    if (/[?&]guest=1/.test(location.search)) {
      GUEST = true;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
      return;
    }
  } catch (e) {}

  // 服务端已经注入了 window.__DSH_GUEST__，直接用它最准
  try {
    if (typeof window.__DSH_GUEST__ === 'boolean') {
      GUEST = window.__DSH_GUEST__;
      if (!GUEST) return;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
      return;
    }
  } catch (e) {}

  // 兜底：问一下自己的角色：guest 才启用
  try {
    var _f = window.fetch;
    _f('/api/auth/status?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        GUEST = !!(d && d.role === 'guest');
        if (GUEST) {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
          } else {
            boot();
          }
        }
      })
      .catch(function () { /* 拿不到就当主人处理，避免误锁 */ });
  } catch (e) {}
})();
