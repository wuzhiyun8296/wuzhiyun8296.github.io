/*
 * 幻想域设定集（my-world-system）
 * Copyright (C) 2026 wuzhiyun8296
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * 本程序是自由软件：你可以依据 GNU 通用公共许可证（GPL-3.0）的条款
 * 再分发和/或修改它。分发本程序或修改版本时，必须同样以 GPL-3.0 开源。
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */
const BOOT_T0 = Date.now();   // 启动计时（排查无网络时变慢）
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const marked = require('marked'); // 💡 移到顶层引入

// ================= 💡 进程兜底 =================
// 任何一次请求里漏出来的异常都不该让整个后台悄无声息地死掉，
// 否则前端只会看到一句 "Failed to fetch"，完全不知道发生了什么。
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', (err && err.stack) ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', (reason && reason.stack) ? reason.stack : reason);
});

const app = express();
app.use(cors());
app.use(express.static(__dirname)); 
// ⚠️ 地图/纪元快照会把整张 PNG 以 base64 塞进 JSON，
//    默认 100kb 上限会导致保存静默失败（413），这里必须放开。
app.use(express.json({ limit: '100mb' }));

app.use('/libs/vue', express.static(path.join(__dirname, 'node_modules/vue/dist')));
app.use('/libs/marked', express.static(path.join(__dirname, 'node_modules/marked')));
app.use('/libs/echarts', express.static(path.join(__dirname, 'node_modules/echarts/dist')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

const DOCS_DIR = path.join(__dirname, 'website/docs');
const PUBLIC_DIR = path.join(DOCS_DIR, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const FONTS_DIR = path.join(PUBLIC_DIR, 'fonts');
const LIBRARY_DIR = path.join(__dirname, 'library');

const NOVEL_FRONTEND_DIR = path.join(DOCS_DIR, 'novel'); 
const NOVEL_CHAPTERS_DIR = path.join(NOVEL_FRONTEND_DIR, 'chapters'); 

fs.ensureDirSync(PUBLIC_DIR);
fs.ensureDirSync(ASSETS_DIR);
fs.ensureDirSync(FONTS_DIR);
fs.ensureDirSync(LIBRARY_DIR);
fs.ensureDirSync(NOVEL_FRONTEND_DIR);
fs.ensureDirSync(NOVEL_CHAPTERS_DIR);

app.use('/public', express.static(PUBLIC_DIR));
app.use('/assets', express.static(path.join(DOCS_DIR, 'assets')));

const IGNORE_DIRS = ['assets', 'public', 'components', 'node_modules', '.vitepress', 'website', 'novel', 'chapters'];

// ================= 图片上传配置 =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSETS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `char_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有上传文件' });
  res.json({ url: `/public/assets/${req.file.filename}` });
});

// ================= 字体上传配置 =================
const fontStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FONTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});
const uploadFont = multer({ storage: fontStorage });

app.post('/api/upload-font', uploadFont.single('font'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '没有上传字体文件' });
    
    const fontName = req.body.fontName || req.file.originalname.split('.')[0];
    const fontUrl = `/public/fonts/${req.file.filename}`;
    const cssPath = path.join(PUBLIC_DIR, 'fonts.css');

    const fontFaceRule = `\n@font-face {\n  font-family: '${fontName}';\n  src: url('${fontUrl}');\n  font-display: swap;\n}\n`;
    await fs.appendFile(cssPath, fontFaceRule, 'utf-8');

    const jsonPath = path.join(PUBLIC_DIR, 'system-fonts.json');
    let fontsList = fs.existsSync(jsonPath) ? await fs.readJson(jsonPath) : [];
    if(!fontsList.includes(fontName)) {
      fontsList.push(fontName);
      await fs.writeJson(jsonPath, fontsList, { spaces: 2 });
    }

    res.json({ success: true, fontName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/fonts', async (req, res) => {
  const jsonPath = path.join(PUBLIC_DIR, 'system-fonts.json');
  if (!fs.existsSync(jsonPath)) await fs.writeJson(jsonPath, []);
  res.json(await fs.readJson(jsonPath));
});

// ================= 文章接口 =================
app.get('/api/files', async (req, res) => {
  const getTree = async (dir, isRoot = false) => {
    const files = await fs.readdir(dir);
    const tree = [];
    for (const file of files) {
      if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;
      
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // 💡 文件夹也要带 path：否则在文章编辑里删文件夹时 path 是 undefined，
        //    服务端 path.join(DOCS_DIR, undefined) 直接抛 TypeError
        tree.push({
          name: file,
          type: 'folder',
          path: path.relative(DOCS_DIR, fullPath).replace(/\\/g, '/'),
          children: await getTree(fullPath, false)
        });
      } else if (file.endsWith('.md')) {
        if (isRoot) continue; 
        tree.push({ name: file, type: 'file', path: path.relative(DOCS_DIR, fullPath) });
      }
    }
    return tree;
  };
  res.json(await getTree(DOCS_DIR, true));
});

app.get('/api/file', async (req, res) => {
  try {
    const filePath = path.join(DOCS_DIR, req.query.path);
    if (fs.existsSync(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (error) {
    res.json({ content: '' });
  }
});

app.post('/api/file', async (req, res) => {
  const filePath = path.join(DOCS_DIR, req.body.path);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, req.body.content, 'utf-8');
  res.json({ success: true });
});

// ================= 智能删除接口 =================
app.post('/api/delete', async (req, res) => {
  try {
    const targetPath = req.body && req.body.path;
    // 💡 先校验：path 必须是字符串，否则 path.join 会抛 TypeError
    if (typeof targetPath !== 'string' || !targetPath.trim()) {
      return res.status(400).json({ error: '缺少有效的 path 参数（文件夹和文件都必须带 path）' });
    }
    if (/[\\/]\.\./.test(targetPath) || path.isAbsolute(targetPath)) {
      return res.status(403).json({ error: '非法路径' });
    }

    const fullPath = path.resolve(DOCS_DIR, targetPath);
    const docsRoot = path.resolve(DOCS_DIR) + path.sep;
    if (!fullPath.startsWith(docsRoot)) return res.status(403).json({ error: '非法路径' });

    if (fs.existsSync(fullPath)) {
      await fs.remove(fullPath); 
      
      const treePath = path.join(PUBLIC_DIR, 'world-tree.json');
      if (fs.existsSync(treePath)) {
        let treeData = await fs.readJson(treePath);
        const cleanPath = targetPath.replace(/\\/g, '/');
        
        const cleanTree = (nodes) => {
          for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (node.type === 'file') {
              const nodeSlug = node.slug.replace(/^\//, '');
              if (targetPath.endsWith('.md')) {
                 if (nodeSlug === cleanPath || nodeSlug === cleanPath.replace('.md', '')) {
                   nodes.splice(i, 1);
                 }
              } else {
                 if (nodeSlug.startsWith(cleanPath + '/')) {
                   nodes.splice(i, 1);
                 }
              }
            } else if (node.children) {
              cleanTree(node.children);
            }
          }
        };
        cleanTree(treeData);
        await fs.writeJson(treePath, treeData, { spaces: 2 });
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= 时间线接口 =================
app.get('/api/timeline', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'timeline.json');
  if (!fs.existsSync(filePath)) await fs.writeJson(filePath, []);
  res.json(await fs.readJson(filePath));
});
app.post('/api/timeline', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'timeline.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 人物档案接口 =================
app.get('/api/characters', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'characters.json');
  if (!fs.existsSync(filePath)) await fs.writeJson(filePath, []);
  res.json(await fs.readJson(filePath));
});
app.post('/api/characters', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'characters.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 图谱接口 =================
app.get('/api/graph', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'graph.json');
  if (!fs.existsSync(filePath)) await fs.writeJson(filePath, { nodes: [], links: [] });
  res.json(await fs.readJson(filePath));
});
app.post('/api/graph', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'graph.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 金融系统接口 =================
app.get('/api/finance', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'finance.json');
  if (!fs.existsSync(filePath)) {
    // 💡 全新安装不该看到作者的示例数据：给空表，让用户自己填
    await fs.writeJson(filePath, {
      items: [],
      stocks: [],
      currencies: []
    }, { spaces: 2 });
  }
  res.json(await fs.readJson(filePath));
});
app.post('/api/finance', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'finance.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 世界观树接口 =================
app.get('/api/world-tree', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'world-tree.json');
  if (!fs.existsSync(filePath)) await fs.writeJson(filePath, [], { spaces: 2 });
  let treeData = await fs.readJson(filePath);
  
  let needMigration = false;
  treeData = treeData.map(cat => {
    if (cat.category !== undefined && cat.type === undefined) {
      needMigration = true;
      return {
        type: 'folder', name: cat.category, icon: cat.icon || '📁',
        children: (cat.items || []).map(item => ({ type: 'file', name: item.title, slug: item.slug, desc: item.desc }))
      };
    }
    return cat;
  });
  
  if (needMigration) await fs.writeJson(filePath, treeData, { spaces: 2 });
  res.json(treeData);
});
app.post('/api/world-tree', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'world-tree.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 智能创建文档接口 =================
app.post('/api/create-doc', async (req, res) => {
  try {
    const { path: docPath, title } = req.body;
    let cleanPath = docPath.replace(/^\//, '');
    if (!cleanPath.endsWith('.md')) cleanPath += '.md';
    
    const fullPath = path.join(DOCS_DIR, cleanPath);
    if (fs.existsSync(fullPath)) return res.json({ success: true, existed: true });
    
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, `# ${title || '新设定'}\n\n开始编写你的故事...\n`, 'utf-8');
    res.json({ success: true, existed: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= 自动同步文章到世界观树 =================
app.post('/api/sync-tree', async (req, res) => {
  try {
    const treePath = path.join(PUBLIC_DIR, 'world-tree.json');
    let treeData = fs.existsSync(treePath) ? await fs.readJson(treePath) : [];
    
    const allMdFiles = [];
    const dirSet = new Set();
    const scanDir = (dir, baseDir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;

        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          dirSet.add(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
          scanDir(fullPath, baseDir);
        } else if (file.endsWith('.md') && file !== 'index.md') {
          const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          // 💡 只收「子目录里」的页面：docs 根目录下那些是系统页（地图/时间线/历史模拟…），
          //    不属于世界观设定，收进树里只会污染结构
          if (rel.includes('/')) allMdFiles.push(rel);
        }
      }
    };
    scanDir(DOCS_DIR, DOCS_DIR);

    let addedCount = 0;
    const existingSlugs = new Set();
    const collectSlugs = (nodes) => {
      nodes.forEach(node => {
        if (node.type === 'file') existingSlugs.add(node.slug.replace(/^\//, ''));
        if (node.children) collectSlugs(node.children);
      });
    };
    collectSlugs(treeData);

    allMdFiles.forEach(mdFile => {
      const slug = mdFile.replace('.md', '');
      if (existingSlugs.has(slug)) return; 

      const parts = slug.split('/');
      let currentLevel = treeData;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let existing = currentLevel.find(n => n.name === part);

        if (!existing) {
          if (isFile) {
            existing = { type: 'file', name: part, slug: `/${slug}`, desc: '系统自动提取的设定条目，可在此修改描述。' };
            currentLevel.push(existing);
            addedCount++;
          } else {
            existing = { type: 'folder', name: part, icon: '📁', children: [], auto: true };
            currentLevel.push(existing);
          }
        }
        if (!isFile) {
          if(!existing.children) existing.children = [];
          currentLevel = existing.children;
        }
      });
    });

    // 💡 反向同步：物理文件已被删除的条目，从树里移除（只删树节点，不动文件）
    const existSet = new Set(allMdFiles.map(f => f.replace('.md', '')));
    let removedCount = 0;
    const prune = (nodes, prefix) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const rel = prefix ? `${prefix}/${node.name}` : node.name;
        if (node.type === 'file') {
          const key = String(node.slug || '').replace(/^\//, '');
          if (key && !existSet.has(key)) { nodes.splice(i, 1); removedCount++; }
        } else if (Array.isArray(node.children)) {
          prune(node.children, rel);
          // 空分类：由同步自动创建、且磁盘上目录已不存在的，一并清掉
          // （手工建的分类不动，避免刚添加就被删）
          if (node.children.length === 0 && node.auto && !dirSet.has(rel)) {
            nodes.splice(i, 1); removedCount++;
          }
        }
      }
    };
    prune(treeData, '');

    await fs.writeJson(treePath, treeData, { spaces: 2 });
    res.json({ success: true, addedCount, removedCount, treeData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= 地图系统接口 =================
app.get('/api/map', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'map.json');
  if (!fs.existsSync(filePath)) {
    await fs.writeJson(filePath, { image: '', markers: [] }, { spaces: 2 });
  }
  res.json(await fs.readJson(filePath));
});

app.post('/api/map', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'map.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 历史推演接口 =================
// 设计原则：事件是唯一真相，版图由「据点归属 + 重新划分」算出来
const HISTORY_FILE = path.join(PUBLIC_DIR, 'history.json');
const HISTORY_DEFAULT = {
  version: 1,
  grid: { cols: 400, rows: 225 },
  epochs: [
    { id: 'e1', name: '第一纪元 · 开拓', start: '开元元年', end: '开元 320', ordinal: 1 }
  ],
  states: [],
  sites: [],
  events: []
};

app.get('/api/history', async (req, res) => {
  if (!fs.existsSync(HISTORY_FILE)) {
    await fs.writeJson(HISTORY_FILE, HISTORY_DEFAULT, { spaces: 2 });
  }
  res.json(await fs.readJson(HISTORY_FILE));
});

app.post('/api/history', async (req, res) => {
  await fs.writeJson(HISTORY_FILE, req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 版本信息（仪表盘展示用） =================
// 本地 version.json + 远端 version.json 对比，结果缓存 5 分钟，避免每次刷新都打网络
let versionCache = { at: 0, data: null };
const VERSION_CACHE_MS = 5 * 60 * 1000;

app.get('/api/version', async (req, res) => {
  try {
    const force = String(req.query.force || '') === '1';
    const cacheTtl = versionCache.ttl || VERSION_CACHE_MS;
    if (!force && versionCache.data && (Date.now() - versionCache.at) < cacheTtl) {
      return res.json({ ...versionCache.data, cached: true });
    }
    const local = await readLocalVersion();
    const cfg = await readUpdateConfig();

    // 逐个源去问（并行），把每个仓库的版本都带回去
    const list = Array.isArray(cfg.sources) ? cfg.sources : [];
    const results = await Promise.all(list.map(async (s) => {
      const platform = s.repo.host === 'gitee.com' ? 'gitee' : 'github';
      const base = {
        platform: platform,
        label: platform === 'gitee' ? 'Gitee' : 'GitHub',
        repo: `${s.repo.owner}/${s.repo.repo}`,
        url: s.repo.pageUrl,
        branch: s.branch
      };
      try {
        // 💡 每个来源最多等 5 秒：断网时不会再一个源一个源地干等
        const v = await Promise.race([
          fetchRemoteVersion(s.repo, s.branch),
          new Promise((_, reject) => setTimeout(() => reject(new Error('超时（可能是断网）')), 5000))
        ]);
        return { ...base, ok: true, version: v.id, pushedAt: v.pushedAt || '' };
      } catch (e) {
        return { ...base, ok: false, version: '', error: e.message };
      }
    }));

    const good = results.filter(r => r.ok);
    const primary = good[0] || null;
    const latest = primary ? primary.version : '';
    const data = {
      current: local.id || '',
      latest: latest,
      hasUpdate: latest ? latest !== local.id : null,
      // 主用来源（第一个读成功的仓库）
      source: primary ? `${primary.platform}/${primary.repo}` : '',
      platform: primary ? primary.platform : '',
      platformLabel: primary ? primary.label : '',
      repo: primary ? primary.repo : '',
      repoUrl: primary ? primary.url : '',
      // 全部来源明细（含失败的）
      sources: results,
      error: good.length ? '' : (results[0] ? results[0].error : '没有配置更新源'),
      checkedAt: Date.now()
    };
    // 💡 全部来源都失败（多半是断网）时，只缓存 60 秒，避免频繁重试又长时间等待
    const allFailed = good.length === 0;
    versionCache = { at: Date.now(), data: data, ttl: allFailed ? 60000 : VERSION_CACHE_MS };
    res.json(data);
  } catch (e) {
    res.json({ current: '', latest: '', hasUpdate: null, error: e.message, sources: [] });
  }
});

// ================= 高级剧情线管理接口 =================
app.get('/api/plotline', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'plotline.json');
  if (!fs.existsSync(filePath)) {
    // 💡 全新安装从空白大纲开始，不要塞示例卷章
    const defaultData = [];
    await fs.writeJson(filePath, defaultData, { spaces: 2 });
  }
  res.json(await fs.readJson(filePath));
});

app.post('/api/plotline', async (req, res) => {
  await fs.writeJson(path.join(PUBLIC_DIR, 'plotline.json'), req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= 小说书库独立接口 =================
app.get('/api/library/tree', async (req, res) => {
  try {
    const getTree = async (dir) => {
      const files = await fs.readdir(dir);
      const tree = [];
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          tree.push({ name: file, type: 'folder', children: await getTree(fullPath) });
        } else if (file.endsWith('.md')) {
          tree.push({ name: file, type: 'file', path: path.relative(LIBRARY_DIR, fullPath).replace(/\\/g, '/') });
        }
      }
      tree.sort((a, b) => (a.type === 'folder' && b.type !== 'folder' ? -1 : 1));
      return tree;
    };
    res.json(await getTree(LIBRARY_DIR));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/library/file', async (req, res) => {
  try {
    const filePath = path.join(LIBRARY_DIR, req.query.path);
    if (fs.existsSync(filePath)) {
      res.json({ content: await fs.readFile(filePath, 'utf-8') });
    } else {
      res.json({ content: '' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/library/file', async (req, res) => {
  try {
    const filePath = path.join(LIBRARY_DIR, req.body.path);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, req.body.content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/library/delete', async (req, res) => {
  try {
    const targetPath = path.join(LIBRARY_DIR, req.body.path);
    if (!targetPath.startsWith(LIBRARY_DIR)) return res.status(403).json({ error: '非法路径' });
    if (fs.existsSync(targetPath)) {
      await fs.remove(targetPath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/library/rename', async (req, res) => {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) return res.status(400).json({ error: '参数不全' });

    const oldFullPath = path.join(LIBRARY_DIR, oldPath);
    if (!fs.existsSync(oldFullPath)) return res.status(404).json({ error: '原文件不存在' });

    const isFolder = fs.statSync(oldFullPath).isDirectory();
    const parentDir = path.dirname(oldFullPath);

    let newFileName = newName.trim();
    if (!isFolder && !newFileName.endsWith('.md')) newFileName += '.md';

    const newFullPath = path.join(parentDir, newFileName);

    if (fs.existsSync(newFullPath)) return res.status(400).json({ error: '该名称已存在' });

    await fs.rename(oldFullPath, newFullPath);
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

// 💡 核心升级：一键导出多格式
app.get('/api/library/export', async (req, res) => {
  try {
    const bookName = req.query.book;
    const format = req.query.format || 'html'; // 'html', 'txt', 'novel'
    if (!bookName) return res.status(400).send('缺少书籍名称');

    const bookDir = path.join(LIBRARY_DIR, bookName);
    if (!fs.existsSync(bookDir)) return res.status(404).send('找不到该书籍文件夹');

    const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
    files.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));

    if (format === 'txt' || format === 'novel') {
      let allText = '';
      for (const file of files) {
        const title = file.replace('.md', '');
        const rawContent = fs.readFileSync(path.join(bookDir, file), 'utf-8');
        
        // 去除 HTML 标签，转回纯文本
        let cleanText = rawContent
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&#12288;/g, '　')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

        // 清理多余空行，去除行首尾空白
        cleanText = cleanText.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');

        if (format === 'novel') {
          // 网文格式：章节标题独占一行，正文首行全角缩进
          const paragraphs = cleanText.split('\n').filter(p => p.trim() !== '');
          allText += `\n\n${title}\n\n`;
          paragraphs.forEach(p => {
             // 如果已经有缩进就不重复加了
             if (p.startsWith('　　')) allText += `${p}\n`;
             else allText += `　　${p}\n`;
          });
        } else {
          // 纯 TXT 格式
          allText += `\n\n===== ${title} =====\n\n${cleanText}\n`;
        }
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bookName)}.txt"`);
      return res.send(allText);
    }

    // 默认 HTML 格式
    let tocHtml = '<ul>';
    let contentHtml = '';

    for (const file of files) {
      const title = file.replace('.md', '');
      const rawContent = fs.readFileSync(path.join(bookDir, file), 'utf-8');
      const parsedHtml = marked.parse(rawContent);

      tocHtml += `<li><a href="#chapter-${title}">${title}</a></li>`;
      contentHtml += `<div class="chapter" id="chapter-${title}">${parsedHtml}</div><div class="page-break"></div>`;
    }
    tocHtml += '</ul>';

    const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${bookName} - 小说集</title>
  <style>
    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; background-color: #f4f4f4; color: #333; line-height: 2; margin: 0; padding: 0; font-size: 18px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 60px 80px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px; margin-top: 40px; margin-bottom: 40px; }
    h1.book-title { text-align: center; font-size: 36px; color: #111; margin-bottom: 10px; }
    .book-subtitle { text-align: center; color: #888; font-size: 16px; margin-bottom: 50px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
    .toc { background: #f9f9f9; padding: 30px; border-radius: 8px; margin-bottom: 50px; }
    .toc h2 { margin-top: 0; font-size: 24px; color: #222; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { margin-bottom: 15px; }
    .toc a { color: #0e639c; text-decoration: none; font-size: 16px; font-weight: bold; transition: color 0.2s; }
    .toc a:hover { color: #1177bb; text-decoration: underline; }
    .chapter { margin-bottom: 40px; }
    .chapter h1 { font-size: 28px; text-align: center; margin-bottom: 30px; color: #111; }
    .chapter h2, .chapter h3 { color: #333; margin-top: 30px; }
    .chapter p { text-indent: 2em; margin: 15px 0; text-align: justify; }
    .chapter div { text-indent: 2em; margin: 10px 0; }
    .page-break { page-break-after: always; border-bottom: 1px dashed #ccc; margin: 40px 0; }
    @media print { body { background: #fff; } .container { box-shadow: none; margin: 0; padding: 0; max-width: 100%; } .toc { background: transparent; border-bottom: 1px solid #000; padding: 0; } .page-break { page-break-after: always; border: none; margin: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="book-title">${bookName}</h1>
    <div class="book-subtitle">小说集 · 一键成书</div>
    <div class="toc"><h2>📖 目录</h2>${tocHtml}</div>
    <div class="main-content">${contentHtml}</div>
    <div style="text-align: center; color: #999; font-size: 14px; margin-top: 60px;">— 全书完 —</div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bookName)}.html"`);
    res.send(htmlTemplate);

  } catch (error) {
    res.status(500).send('导出失败: ' + error.message);
  }
});

// ================= 仪表盘与全局搜索接口 =================
const INBOX_FILE = path.join(LIBRARY_DIR, 'inbox.json');

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    let totalWords = 0;
    let chapterCount = 0;

    // 💡 统计口径：只算书库（library）里的小说章节
    //    website/docs 下的一切内容（文章编辑、设定百科、同步稿）一律不计入
    const countWords = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith('.')) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          countWords(fullPath);
        } else if (file.endsWith('.md')) {
          const rawContent = fs.readFileSync(fullPath, 'utf-8');

          let cleanText = rawContent
            .replace(/<[^>]+>/g, '')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/[#*_`~=\-|>\s\n\r]/g, '');

          totalWords += cleanText.length;
          chapterCount++;
        }
      }
    };

    countWords(LIBRARY_DIR);

    const charFile = path.join(PUBLIC_DIR, 'characters.json');
    const charCount = fs.existsSync(charFile) ? (await fs.readJson(charFile)).length : 0;

    const treeFile = path.join(PUBLIC_DIR, 'world-tree.json');
    const treeCount = fs.existsSync(treeFile) ? (await fs.readJson(treeFile)).length : 0;

    const mapFile = path.join(PUBLIC_DIR, 'map.json');
    let markerCount = 0;
    if (fs.existsSync(mapFile)) {
      const mapData = await fs.readJson(mapFile);
      markerCount = mapData.markers ? mapData.markers.length : 0;
    }

    res.json({ totalWords, chapterCount, charCount, treeCount, markerCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/global-search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const results = [];
  const searchDir = (dir, type) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;

      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDir(fullPath, type);
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes(query)) {
          const index = content.indexOf(query);
          const snippet = content.substring(Math.max(0, index - 20), Math.min(content.length, index + 30)).replace(/\n/g, ' ');
          results.push({
            title: file.replace('.md', ''),
            path: fullPath,
            type: type,
            snippet: `...${snippet}...`
          });
        }
      }
    }
  };
  
  searchDir(DOCS_DIR, '设定集');
  searchDir(LIBRARY_DIR, '书库');
  res.json(results);
});

app.get('/api/backup', async (req, res) => {
  try {
    const backupData = {
      docs: {},
      library: {},
      publicData: {}
    };

    const readDirRecursive = (dir, obj) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          readDirRecursive(fullPath, obj);
        } else if (file.endsWith('.md') || file.endsWith('.json')) {
          obj[fullPath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }
    };

    readDirRecursive(DOCS_DIR, backupData.docs);
    readDirRecursive(LIBRARY_DIR, backupData.library);
    
    ['timeline.json', 'characters.json', 'world-tree.json', 'finance.json', 'map.json', 'graph.json'].forEach(f => {
       const p = path.join(PUBLIC_DIR, f);
       if(fs.existsSync(p)) backupData.publicData[f] = fs.readJsonSync(p);
    });

    res.json(backupData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inbox', async (req, res) => {
  if (!fs.existsSync(INBOX_FILE)) await fs.writeJson(INBOX_FILE, []);
  res.json(await fs.readJson(INBOX_FILE));
});
app.post('/api/inbox', async (req, res) => {
  await fs.writeJson(INBOX_FILE, req.body, { spaces: 2 });
  res.json({ success: true });
});

// ================= GitHub 自动推送接口 =================
const GIT_CONFIG_FILE = path.join(__dirname, 'git-config.json');

// ================= 💡 匿名更新配置（公开仓库，无需 Token） =================
const UPDATE_CONFIG_FILE = path.join(__dirname, 'update-config.json');

// 读取更新源配置：支持「多源」——先从 GitHub 下，失败自动切 Gitee
// 新格式: { "sources": [ { repoUrl, branch, lastCommit }, ... ] }
// 旧格式: { "repoUrl": "...", "branch": "main", "lastCommit": "..." } 仍然兼容
// 内置的默认更新源：全新安装时 update-config.json 可能不存在，
// 没有它后台点「检测更新」会直接报「未配置更新源」
const DEFAULT_UPDATE_SOURCES = [
  { repoUrl: 'https://gitee.com/amspace/wuzhiyun8296.github.io', branch: 'main', lastCommit: '' },
  { repoUrl: 'https://github.com/wuzhiyun8296/wuzhiyun8296.github.io', branch: 'main', lastCommit: '' }
];

async function readUpdateConfig() {
  let cfg = {};
  if (fs.existsSync(UPDATE_CONFIG_FILE)) {
    try { cfg = await fs.readJson(UPDATE_CONFIG_FILE); } catch (e) { cfg = {}; }
  }

  let raw = Array.isArray(cfg.sources) ? cfg.sources.slice() : [];
  if (!raw.length && cfg.repoUrl) {
    raw = [{ repoUrl: cfg.repoUrl, branch: cfg.branch, lastCommit: cfg.lastCommit }];
  }
  // 💡 兜底：文件缺失或没写 sources 时，用内置的公开仓库地址
  if (!raw.length) raw = DEFAULT_UPDATE_SOURCES.slice();

  const sources = [];
  for (const s of raw) {
    if (!s || !s.repoUrl) continue;
    const parsed = parseRepoUrl(s.repoUrl);
    if (!parsed) continue;
    sources.push({
      repoUrl: parsed.pageUrl,
      branch: String(s.branch || cfg.branch || 'main'),
      lastCommit: String(s.lastCommit || cfg.lastCommit || ''),
      repo: parsed
    });
  }
  return { sources: sources };
}

// 从仓库地址里抠出「托管平台 / owner / repo」
// 同时支持 github.com 和 gitee.com（https 链接、带 .git、带子路径都行）
function parseRepoUrl(url) {
  const raw = String(url || '').trim().replace(/\.git$/i, '');
  const m = raw.match(/(github\.com|gitee\.com)[\/:]([^\/]+)\/([^\/\?#\s]+)/i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  const owner = m[2];
  const repo = m[3].replace(/\.git$/i, '');
  return {
    host: host,
    owner: owner,
    repo: repo,
    pageUrl: `https://${host}/${owner}/${repo}`,
    gitUrl: `https://${host}/${owner}/${repo}.git`
  };
}

// 各平台的归档 zip 地址
// 💡 每个平台只给一个地址：同一域名的「备用地址」在连不通时也会一起连不通，
//    多试一遍只会白白多等一个超时周期，把切换时间拖长一倍。
function buildArchiveUrls(repo, branch) {
  if (repo.host === 'gitee.com') {
    return [`https://gitee.com/${repo.owner}/${repo.repo}/repository/archive/${branch}.zip`];
  }
  return [`https://codeload.github.com/${repo.owner}/${repo.repo}/zip/refs/heads/${branch}`];
}

// ================= 💡 版本特征码（version.json） =================
// 客户端靠它判断「远端是不是比我新」，比 commit 号直观，也不依赖 Git / API。
const VERSION_FILE = path.join(__dirname, 'version.json');

function makeVersionId(d) {
  const t = d || new Date();
  const p = (n) => String(n).padStart(2, '0');
  // 精确到秒：同一分钟里连着推两次也能区分开
  return `${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}`;
}

async function readLocalVersion() {
  if (!fs.existsSync(VERSION_FILE)) return { id: '', pushedAt: '' };
  try {
    const v = await fs.readJson(VERSION_FILE);
    return { id: String(v.id || ''), pushedAt: String(v.pushedAt || '') };
  } catch (e) {
    return { id: '', pushedAt: '' };
  }
}

function versionRawUrls(repo, branch) {
  if (repo.host === 'gitee.com') {
    return [`https://gitee.com/${repo.owner}/${repo.repo}/raw/${branch}/version.json`];
  }
  return [
    `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/version.json`,
    `https://github.com/${repo.owner}/${repo.repo}/raw/${branch}/version.json`
  ];
}

// 读取远端 version.json（公开仓库，匿名可读）
async function fetchRemoteVersion(repo, branch) {
  let lastErr = null;
  for (const u of versionRawUrls(repo, branch)) {
    try {
      const text = await httpsGetText(u, 4000);   // 无网络时快速失败，避免页面长时间「正在检查更新」
      const v = JSON.parse(text);
      if (v && v.id) return { id: String(v.id), pushedAt: String(v.pushedAt || '') };
      throw new Error('version.json 里没有 id 字段');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('读取 version.json 失败');
}

// 推送后给前端的 Gitee 同步提示
async function readGiteeHint() {
  // 💡 只提示「使用者自己的」仓库，绝不能把作者自己的 Gitee 仓推给别人：
  //    1) 用户自己的仓库就在 Gitee → 直接提示它
  //    2) 用户仓库在 GitHub → 只有在「同名仓库」确实存在于 Gitee 源里时才提示
  //       （作者本人的 GitHub 仓与 Gitee 镜像同名，所以他自己仍然会看到提示）
  try {
    if (!fs.existsSync(GIT_CONFIG_FILE)) return null;
    const own = parseRepoUrl((await fs.readJson(GIT_CONFIG_FILE)).repoUrl);
    if (!own) return null;

    if (own.host === 'gitee.com') {
      return {
        repoUrl: own.pageUrl,
        settingsUrl: `${own.pageUrl}/settings`,
        branch: 'main'
      };
    }

    const cfg = await readUpdateConfig();
    const same = cfg.sources.find(
      (s) => s.repo.host === 'gitee.com' && s.repo.repo.toLowerCase() === own.repo.toLowerCase()
    );
    if (!same) return null;
    return {
      repoUrl: same.repo.pageUrl,
      settingsUrl: `${same.repo.pageUrl}/settings`,
      branch: same.branch
    };
  } catch (e) {
    return null;
  }
}

// 原则：remote 里永远只存「干净地址」，Token 只在执行命令的那一瞬间通过 HTTP 头传递，
//       不再写进 .git/config，也不会出现在 URL / 日志里。
// ================= 💡 Git 凭据安全处理 =================
// 原则：remote 里永远只存「干净地址」，Token 只在执行命令的那一瞬间通过 HTTP 头传递，
function cleanGitUrl(repoUrl) {
  let u = String(repoUrl || '').trim().replace(/\.git$/i, '');
  if (!u) return '';
  if (/^git@/i.test(u)) {
    const m = u.match(/^git@([^:]+):(.+)$/);
    if (m) return `https://${m[1]}/${m[2]}.git`;
  }
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  // 剥掉可能混进来的 user:token@
  u = u.replace(/^(https:\/\/)[^@\/]+@/i, '$1');
  return u + '.git';
}

// 生成给 git 用的认证参数：禁用凭据助手 + 一次性 Authorization 头
// Gitee 的 HTTPS 认证必须是「用户名:私人令牌」；GitHub 两种都收，所以有用户名就用用户名
function basicAuthHeaderArg(token, userName) {
  const t = String(token || '').trim();
  if (!t) return '';
  const u = String(userName || '').trim();
  const pair = u ? `${u}:${t}` : `x-access-token:${t}`;
  const b64 = Buffer.from(pair, 'utf8').toString('base64');
  return ` -c credential.helper= -c http.extraheader="Authorization: Basic ${b64}"`;
}

// 把输出里的 token / base64 / https://xxx@ / Authorization 头全部打成 ***
function redactSecrets(text, secrets) {
  let out = String(text == null ? '' : text);
  for (const s of (secrets || [])) {
    const t = String(s || '').trim();
    if (!t) continue;
    out = out.split(t).join('***');
  }
  return out
    .replace(/Basic\s+[A-Za-z0-9+/=]{8,}/g, 'Basic ***')
    .replace(/https:\/\/[^@\s\/]+@/g, 'https://***@');
}

// 把 origin 改写成干净地址（顺手把历史遗留的 token 从 .git/config 里清掉）
async function sanitizeOriginRemote(runCmd, repoUrl) {
  const clean = cleanGitUrl(repoUrl);
  if (!clean) return false;
  const cur = await runCmd('git remote get-url origin');
  const curUrl = String(cur.output || '').trim();
  if (cur.success && curUrl === clean) return false;
  if (cur.success) {
    await runCmd(`git remote set-url origin "${clean}"`);
  } else {
    await runCmd(`git remote add origin "${clean}"`);
  }
  return true;
}


// 执行外部命令并拿回 stdout（用于 TLS 降级：系统 curl / git 走 Windows 证书库）
// onStderr：可选的实时回调，用来解析 curl 的进度条
function execCapture(cmd, timeoutMs = 180000, onStderr) {
  return new Promise((resolve) => {
    // Windows 控制台默认 GBK，强制切 UTF-8，否则中文报错会变成乱码
    const full = process.platform === 'win32' ? `chcp 65001>nul & ${cmd}` : cmd;
    const child = exec(full, {
      cwd: __dirname,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
      env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0' })
    }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout || ''), stderr: String(stderr || ''), error });
    });
    if (typeof onStderr === 'function' && child && child.stderr) {
      child.stderr.on('data', (chunk) => {
        try { onStderr(String(chunk)); } catch (e) { /* ignore */ }
      });
    }
  });
}

// 原生 https GET → JSON（GitHub API 必须带 User-Agent，否则 403）
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'my-world-system-updater' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        resp.resume();
        return httpsGetJson(resp.headers.location).then(resolve).catch(reject);
      }
      if (resp.statusCode === 404) { resp.resume(); return reject(new Error('仓库或分支不存在（404）')); }
      if (resp.statusCode === 403) { resp.resume(); return reject(new Error('GitHub 限流或拒绝访问（403），稍后再试')); }
      if (resp.statusCode !== 200) { resp.resume(); return reject(new Error('GitHub 返回 HTTP ' + resp.statusCode)); }
      let body = '';
      resp.setEncoding('utf8');
      resp.on('data', (c) => { body += c; });
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('GitHub 返回内容无法解析')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('连接 GitHub 超时')));
  });
}

// 下载文件：多个镜像地址 + 两条通道
// 通道 1：Node 原生 https；通道 2：系统 curl（走 Windows 证书库，能穿代理/杀软）
// 校验文件头是不是真的 ZIP（PK\x03\x04）：防止把 HTML 验证页 / 限流页当成压缩包
function looksLikeZip(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(4);
    const n = fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return n >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
  } catch (e) {
    return false;
  }
}

// 判断一下下回来的东西是不是 HTML（用于给出更准确的报错）
function looksLikeHtml(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    const head = buf.toString('utf8').toLowerCase();
    return head.indexOf('<') > -1;
  } catch (e) {
    return false;
  }
}

// 下载用的浏览器 UA：部分国内站点会按 UA 拦 curl / 拦截非浏览器请求
const UPDATE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 原生 https GET → Buffer（按字节取，避免把图片/ico 当文本弄坏）
function httpsGetBuffer(url, timeoutMs = 20000, opts = {}) {
  const stallMs = opts.stallMs || 6000;        // 多久没收到数据就判定卡住
  const minBps = opts.minBps || 8 * 1024;      // 低于这个速度（字节/秒）就换源
  const slowAfter = opts.slowAfter || 4000;    // 连上多久之后才开始判断「太慢」
  const redirects = opts.redirects || 0;

  return new Promise((resolve, reject) => {
    let done = false;
    const fail = (err) => {
      if (done) return;
      done = true;
      try { req.destroy(); } catch (e) { /* ignore */ }
      reject(err);
    };

    const req = https.get(url, { headers: { 'User-Agent': UPDATE_UA } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        resp.resume();
        if (redirects > 4) return fail(new Error('重定向过多'));
        done = true;
        return httpsGetBuffer(resp.headers.location, timeoutMs, { ...opts, redirects: redirects + 1 }).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) { resp.resume(); return fail(new Error('HTTP ' + resp.statusCode)); }

      const total = parseInt(resp.headers['content-length'] || '0', 10) || 0;
      const chunks = [];
      let received = 0;
      let startedAt = Date.now();
      let lastDataAt = Date.now();
      let lastReport = 0;

      const watchdog = setInterval(() => {
        const now = Date.now();
        const stalled = now - lastDataAt;
        if (stalled > stallMs) {
          clearInterval(watchdog);
          return fail(new Error(`下载卡住 ${Math.round(stalled / 1000)} 秒，换源`));
        }
        const elapsed = now - startedAt;
        if (elapsed > slowAfter && received > 0) {
          const bps = received / (elapsed / 1000);
          if (bps < minBps) {
            clearInterval(watchdog);
            return fail(new Error(`速度过慢 ${Math.round(bps / 1024)} KB/s，换源`));
          }
        }
      }, 800);

      resp.on('data', (c) => {
        chunks.push(c);
        received += c.length;
        lastDataAt = Date.now();
        const now = Date.now();
        if (opts.onProgress && now - lastReport > 300) {
          lastReport = now;
          const elapsed = Math.max(1, now - startedAt) / 1000;
          try {
            opts.onProgress({ received, total, speed: received / elapsed });
          } catch (e) { /* ignore */ }
        }
      });

      resp.on('end', () => {
        clearInterval(watchdog);
        if (done) return;
        done = true;
        if (opts.onProgress) {
          const elapsed = Math.max(1, Date.now() - startedAt) / 1000;
          try { opts.onProgress({ received, total, speed: received / elapsed }); } catch (e) { /* ignore */ }
        }
        resolve(Buffer.concat(chunks));
      });
      resp.on('error', (e) => { clearInterval(watchdog); fail(e); });
    });

    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
    req.setTimeout(timeoutMs, () => fail(new Error('超时')));
  });
}


// 各通道的「单文件 raw 基址」
// Gitee 的 zip 归档已经需要登录，但 raw 单文件仍然匿名可读，所以整包下载改成按文件拉取
function rawBaseUrls(repo, branch) {
  if (repo.host === 'gitee.com') {
    return [`https://gitee.com/${repo.owner}/${repo.repo}/raw/${branch}`];
  }
  return [
    `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}`,
    `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@${branch}`
  ];
}

// curl 的 stderr 里混着进度条（#=O 和百分比），报错时要把它清理掉
function cleanCurlStderr(raw) {
  let out = String(raw || '');
  out = out.replace(/[\r\n]+/g, ' ');
  out = out.replace(/#[#=O\s-]*/g, ' ');              // 进度条的 # = O 字符
  out = out.replace(/\b\d{1,3}(?:\.\d+)?%\b/g, ' ');  // 百分比
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

async function downloadWithFallback(urls, dest, onProgress) {
  const list = Array.isArray(urls) ? urls : [urls];
  const errors = [];
  const report = (p) => { if (typeof onProgress === 'function') { try { onProgress(p); } catch (e) {} } };

  for (const url of list) {
    // 💡 每轮开始先清掉上一轮残留的临时文件（也可能是被别的进程锁着的）
    try { await fs.remove(dest); } catch (e) { /* 删不掉就算了，下面会报 */ }

    try {
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        let done = false;

        // 失败必须「先关流再删文件」，否则 Windows 上句柄没释放 → 文件被锁 →
        // 后面 curl 接手时会报 Permission denied / curl(23)，把真实错误盖掉。
        const bail = (err) => {
          if (done) return;
          done = true;
          try { file.destroy(); } catch (e) { /* ignore */ }
          try { fs.unlinkSync(dest); } catch (e) { /* ignore */ }
          reject(err);
        };

        const follow = (target) => {
          const req = https.get(target, { headers: { 'User-Agent': UPDATE_UA } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              response.resume();
              return follow(response.headers.location);
            }
            if (response.statusCode !== 200) {
              response.resume();
              return bail(new Error(`HTTP ${response.statusCode}`));
            }
            // 💡 有 Content-Length 就能算出百分比，实时回报给前端
            const total = parseInt(response.headers['content-length'] || '0', 10);
            let got = 0;
            response.on('data', (chunk) => {
              got += chunk.length;
              report({ received: got, total: total });
            });
            response.pipe(file);
            file.on('error', bail);
            file.on('finish', () => {
              if (done) return;
              done = true;
              file.close(() => resolve());
            });
            response.on('error', bail);
          });
          req.on('error', bail);
          // 💡 20 秒没有任何数据往来就放弃，交给系统 curl 重试。
          //    之前是 45 秒，被墙时会白等太久，切换 Gitee 也就慢。
          req.setTimeout(20000, () => req.destroy(new Error('连接超时')));
        };
        follow(url);
      });
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1024 && looksLikeZip(dest)) return { via: 'node', url };
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1024 && looksLikeHtml(dest)) {
        throw new Error('返回的是网页不是压缩包（可能被站点验证/限流拦截）');
      }
      throw new Error('文件为空或不是压缩包');
    } catch (e) {
      errors.push('node:' + e.message);
      try { await fs.remove(dest); } catch (err) { /* ignore */ }
    }

    // 备用通道：系统 curl（走 Windows 证书库），--progress-bar 的百分比从 stderr 解析
    const r = await execCapture(
      `curl -L --fail --progress-bar -A "${UPDATE_UA}" --connect-timeout 10 --max-time 180 -o "${dest}" "${url}"`,
      200000,
      (chunk) => {
        const m = String(chunk).match(/(\d{1,3}(?:\.\d+)?)%/g);
        if (m && m.length) {
          const pct = parseFloat(m[m.length - 1].replace('%', ''));
          if (!isNaN(pct)) report({ percent: pct });
        }
      }
    );
    if (r.ok) {
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1024 && looksLikeZip(dest)) return { via: 'curl', url };
      if (fs.existsSync(dest) && looksLikeHtml(dest)) {
        errors.push('curl:返回的是网页不是压缩包（可能被站点验证/限流拦截）');
      } else {
        errors.push('curl:文件不完整或不是压缩包');
      }
    } else {
      const rawErr = String(r.stderr || '');
      let msg = cleanCurlStderr(rawErr) || '失败';
      if (/Permission denied|curl: \(23\)/i.test(rawErr)) {
        msg = '写入失败（文件被占用或目录不可写）：' + msg;
      } else if (/timed out|timeout/i.test(rawErr)) {
        msg = '连接超时';
      }
      errors.push('curl:' + msg);
    }
    try { await fs.remove(dest); } catch (err) {}
  }

  throw new Error('下载失败（已尝试 ' + list.length + ' 个地址）：' + errors.join(' / '));
}

// 原生 https GET → 文本（用于 Atom 订阅这类非 JSON 接口）
function httpsGetText(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'my-world-system-updater' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        resp.resume();
        return httpsGetText(resp.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) { resp.resume(); return reject(new Error('HTTP ' + resp.statusCode)); }
      let body = '';
      resp.setEncoding('utf8');
      resp.on('data', (c) => { body += c; });
      resp.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('超时')));
  });
}

// 查询公开仓库最新 commit（匿名，无需 token）
// GitHub：API → github.com 的 Atom 订阅 → git ls-remote
// Gitee ：API v5 → git ls-remote
// 任意一条通就行，电脑没装 Git 也有前两条兜底
async function fetchLatestCommit(repo, branch) {
  const errors = [];

  // 1) 平台 API
  try {
    if (repo.host === 'gitee.com') {
      const data = await httpsGetJson(`https://gitee.com/api/v5/repos/${repo.owner}/${repo.repo}/branches/${branch}`);
      const c = data.commit || {};
      const inner = c.commit || {};
      const sha = c.sha || data.sha;
      if (!sha) throw new Error('返回中没有 commit sha');
      const date = (inner.committer && inner.committer.date) || (inner.author && inner.author.date) || '';
      return { sha: sha, date: date, message: '(gitee api)' };
    }
    const data = await httpsGetJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${branch}`);
    const commit = data.commit || {};
    return {
      sha: data.sha,
      date: (commit.author && commit.author.date) || '',
      message: String(commit.message || '').split('\n')[0]
    };
  } catch (e) {
    errors.push('API(' + e.message + ')');
  }

  // 2) GitHub 的 Atom 订阅：不依赖 API、不依赖 Git（Gitee 没有这个入口）
  if (repo.host === 'github.com') {
    try {
      const text = await httpsGetText(`https://github.com/${repo.owner}/${repo.repo}/commits/${branch}.atom`);
      const m = text.match(/Grit::Commit\/([0-9a-f]{40})/i) || text.match(/\/commit\/([0-9a-f]{40})/i);
      if (!m) throw new Error('无法解析返回内容');
      const d = text.match(/<updated>([^<]+)<\/updated>/i);
      return { sha: m[1], date: d ? d[1] : '', message: '(atom)' };
    } catch (e) {
      errors.push('Atom(' + e.message + ')');
    }
  }

  // 3) git ls-remote（任意平台通用，但需要系统里装了 Git）
  try {
    const r = await execCapture(`git -c credential.helper= ls-remote "${repo.gitUrl}" "refs/heads/${branch}"`, 45000);
    const line = r.stdout.split('\n').map((s) => s.trim()).filter(Boolean).find((s) => s.indexOf('refs/heads/' + branch) > -1);
    if (r.ok && line) return { sha: line.split(/\s+/)[0], date: '', message: '(git ls-remote)' };
    throw new Error(r.stderr ? r.stderr.trim() : '未找到分支 ' + branch);
  } catch (e) {
    errors.push('git(' + e.message + ')');
  }

  throw new Error(errors.join(' / '));
}

// 免 Token 的「检测更新」：拿公开仓库最新 commit 和本地记录的 lastCommit 比对
// 返回结构与老的 /api/git/check-update 完全一致，后台前端无需任何改动
async function anonymousCheckUpdate(res) {
  const cfg = await readUpdateConfig();
  if (!cfg.sources.length) {
    return res.json({ success: false, error: '未配置更新源：请在 update-config.json 的 sources 里填写仓库地址（GitHub / Gitee 公开仓库，不需要 Token）' });
  }

  const local = await readLocalVersion();
  const hits = [];
  const errors = [];

  for (const s of cfg.sources) {
    // 💡 首选 version.json 特征码：不依赖 commit 号，也不受「一键更新.bat 只换文件」的影响
    try {
      const remote = await fetchRemoteVersion(s.repo, s.branch);
      const changed = !local.id || remote.id !== local.id;
      hits.push({
        source: s,
        mode: 'version',
        changed: changed,
        text: `${s.repo.host}: 远端版本 ${remote.id}` + (local.id ? `（本地 ${local.id}）` : '（本地还没有版本文件）')
      });
      continue;
    } catch (e) {
      // 远端还没有 version.json（老仓库）→ 退回 commit 比对
    }

    try {
      const latest = await fetchLatestCommit(s.repo, s.branch);
      hits.push({
        source: s,
        mode: 'commit',
        changed: latest.sha !== s.lastCommit,
        text: `${s.repo.host}: ${latest.sha.substring(0, 7)} - ${latest.message} (${latest.date})`
      });
    } catch (e) {
      errors.push(`${s.repo.host}: ${e.message}`);
    }
  }

  // 所有源都连不上：不把用户堵死，允许直接尝试下载更新
  // （下载走的是归档地址 / curl，和版本查询不是同一条路）
  if (!hits.length) {
    return res.json({
      success: true,
      hasUpdate: true,
      count: 1,
      degraded: true,
      mode: 'anonymous',
      logs: [
        '⚠ 所有更新源都无法读取版本：' + errors.join(' / '),
        '已允许直接尝试更新（会依次尝试 GitHub → Gitee）；若下载也失败，请手动覆盖更新包'
      ]
    });
  }

  const changed = hits.filter((h) => h.changed);
  const hasUpdate = changed.length > 0;
  const shown = changed.length ? changed : hits;
  return res.json({
    success: true,
    hasUpdate: hasUpdate,
    count: changed.length,
    mode: 'anonymous',
    source: shown[0].source.repo.host,
    localVersion: local.id,
    remoteVersion: shown[0] && shown[0].mode === 'version' ? shown[0].text : '',
    logs: hasUpdate ? shown.map((h) => h.text) : []
  });
}

// 更新前自动备份将被覆盖的代码（防止冲掉本地未提交的修改），只保留最近 3 次
async function backupBeforeUpdate(items) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const root = path.join(__dirname, '.update_backup');
  const dir = path.join(root, stamp);
  const saved = [];
  for (const item of items) {
    const src = path.join(__dirname, item);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(dir, item);
    if (fs.statSync(src).isDirectory()) {
      await fs.copy(src, dest, {
        filter: (s) => !s.includes('node_modules') && !s.includes('.vitepress\\dist') && !s.includes('.vitepress/cache')
      });
    } else {
      await fs.copy(src, dest);
    }
    saved.push(item);
  }
  const all = (await fs.readdir(root)).sort();
  while (all.length > 3) {
    await fs.remove(path.join(root, all.shift()));
  }
  return { dir: path.relative(__dirname, dir), saved };
}


app.get('/api/git/config', async (req, res) => {
  if (fs.existsSync(GIT_CONFIG_FILE)) res.json(await fs.readJson(GIT_CONFIG_FILE));
  else res.json({ repoUrl: '', userName: '', userEmail: '', token: '' });
});

app.post('/api/git/config', async (req, res) => {
  try {
    await fs.writeJson(GIT_CONFIG_FILE, req.body, { spaces: 2 });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/git/push', async (req, res) => {
  const { message, note } = req.body;
  if (!message) return res.status(400).json({ error: '请填写提交信息' });
  const updateNote = String(note || message || '').trim();
  if (!fs.existsSync(GIT_CONFIG_FILE)) return res.status(400).json({ error: '请先保存 GitHub 配置' });

  const config = await fs.readJson(GIT_CONFIG_FILE);
  if (!config.repoUrl || !config.token) return res.status(400).json({ error: '配置不完整，请检查仓库地址和 Token' });

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { cwd: __dirname, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  let logs = [];
  logs.push(`[INFO] 开始配置并执行 Git 推送...\n`);

  try {
    logs.push(`> 正在自动同步小说书架到前台...\n`);
    await fs.emptyDir(NOVEL_CHAPTERS_DIR); 
    
    const bookcase = []; 
    const protConfig = fs.existsSync(PROTECTION_CONFIG_FILE) ? await fs.readJson(PROTECTION_CONFIG_FILE) : { enableNovelSync: true, enableWatermark: true };
    
    if (protConfig.enableNovelSync) {
      const watermarkStr = protConfig.enableWatermark ? generateZeroWidthWatermark(`[Author:${protConfig.authorName}]`) : '';

      const copyNovelFiles = (srcDir, destDir, currentBookcase) => {
        if (!fs.existsSync(srcDir)) return;
        const items = fs.readdirSync(srcDir).sort((a, b) => {
          const aStat = fs.statSync(path.join(srcDir, a));
          const bStat = fs.statSync(path.join(srcDir, b));
          if (aStat.isDirectory() && !bStat.isDirectory()) return -1;
          if (!aStat.isDirectory() && bStat.isDirectory()) return 1;
          return a.localeCompare(b, 'zh-CN', {numeric: true});
        });

        for (const item of items) {
          if (item.startsWith('.') || item === 'inbox.json') continue;
          const srcPath = path.join(srcDir, item);
          const destPath = path.join(destDir, item);
          const stat = fs.statSync(srcPath);
          
          if (stat.isDirectory()) {
            fs.ensureDirSync(destPath);
            const subBookcase = { title: item, type: 'folder', children: [] };
            currentBookcase.push(subBookcase);
            copyNovelFiles(srcPath, destPath, subBookcase.children);
          } else if (item.endsWith('.md')) {
            let content = fs.readFileSync(srcPath, 'utf-8');
            if (protConfig.enableWatermark) {
              content = content.replace(/[\u200b\u200c\u200d]/g, ''); 
              content = content.replace(/<\/(div|p)>/gi, `${watermarkStr}</$1>`);
              if (!content.includes('</div>') && !content.includes('</p>')) content += watermarkStr;
            }
            fs.writeFileSync(destPath, content, 'utf-8');
            
            currentBookcase.push({ 
              title: item.replace('.md', ''), 
              type: 'file', 
              link: `/novel/chapters/${path.relative(NOVEL_CHAPTERS_DIR, destPath).replace(/\\/g, '/').replace('.md', '')}`
            });
          }
        }
      };

      copyNovelFiles(LIBRARY_DIR, NOVEL_CHAPTERS_DIR, bookcase);
      await fs.writeJson(path.join(PUBLIC_DIR, 'novel-bookcase.json'), bookcase, { spaces: 2 });
      logs.push(`> 小说同步完成，防伪水印已注入。\n`);
    } else {
      logs.push(`> ⚠️ 小说公开已关闭，正在清空前台小说目录以隐藏内容...\n`);
      await fs.writeJson(path.join(PUBLIC_DIR, 'novel-bookcase.json'), [], { spaces: 2 });
      logs.push(`> 前台已隐藏小说。\n`);
    }

    const gitignorePath = path.join(__dirname, '.gitignore');
    
    // 💡 重写 .gitignore
    //    ⚠ 这里决定了「哪些内容会公开到 GitHub Pages」
    //    当前策略：整站公开（页面 md / public 数据 / 立绘图片 / 同步后的小说章节都要推）
    //    只屏蔽：原始手稿(library)、敏感配置(git-config.json)、构建产物和临时文件
        const ignoreContent = `node_modules/
git-config.json
.git/
website/node_modules/
website/.vitepress/cache/
website/.vitepress/dist/

# 屏蔽本地辅助脚本和软著合并文件
merge-codes.js
软著源代码合并.txt

# 只屏蔽原始手稿（不带水印）；站点用的同步章节要发布
library/

# 更新过程的临时产物 / 更新前自动备份（不能进仓库）
update.zip
update-*.zip
.temp_update/
.update_backup/
dev_log.txt
server_log.txt
`;
    await fs.writeFile(gitignorePath, ignoreContent, 'utf-8');

    await runCmd('git init');
    const cleanName = (config.userName || 'Admin').trim();
    const cleanEmail = (config.userEmail || 'admin@local').trim();
    await runCmd(`git config user.name "${cleanName}"`);
    await runCmd(`git config user.email "${cleanEmail}"`);

    const safeToken = String(config.token || '').trim();
    const authArg = basicAuthHeaderArg(safeToken);

    // 💡 安全：origin 只存干净地址；token 只在命令里用请求头传，不落盘
    await sanitizeOriginRemote(runCmd, config.repoUrl);
    logs.push(`> 配置远程仓库: 成功（远程地址已去除 Token）\n`);

    await runCmd('git branch -M main');
    await runCmd('git rm --cached git-config.json -f');

    // 💡 写入版本特征码：客户端靠它判断「远端是不是比我新」
    //    放在 git add 之前，保证它一定进这次提交
    const versionInfo = {
      id: makeVersionId(),
      pushedAt: new Date().toISOString(),
      note: String(updateNote || message || '').replace(/"/g, '').slice(0, 200)
    };
    try {
      await fs.writeJson(VERSION_FILE, versionInfo, { spaces: 2 });
      logs.push(`> 版本特征码: ${versionInfo.id}\n`);
    } catch (e) {
      logs.push(`> 版本特征码写入失败（不影响推送）: ${e.message}\n`);
    }
    
    // 💡 核心修复 2：强制清空 Git 缓存，让新加的 .gitignore 立即生效
    await runCmd('git rm -r --cached . -f');
    
    await runCmd('git add .');

    // 💡 生成「按文件更新」用的清单：客户端逐个 raw 下载，不再依赖 zip 归档
    //    （Gitee 的归档下载已经要求登录，raw 单文件仍然匿名可读）
    try {
      const files = await collectUpdateFiles();
      await fs.writeFile(path.join(__dirname, 'update-files.txt'), files.join('\n') + '\n', 'utf-8');
      await fs.writeJson(path.join(__dirname, 'update-manifest.json'), {
        version: versionInfo.id,
        count: files.length,
        files: files
      }, { spaces: 2 });
      logs.push(`> 更新清单: ${files.length} 个文件\n`);

      await runCmd('git add update-files.txt update-manifest.json');
    } catch (e) {
      logs.push(`> ⚠ 更新清单生成失败（不影响推送）: ${e.message}\n`);
    }

    let res2 = await runCmd(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    logs.push(`> git commit: ${res2.success ? '成功' : '跳过(无修改)'}\n`);

    logs.push(`> 正在推送到 GitHub...\n`);
    // 💡 核心修复 3：使用 -f 强推，用干净代码覆盖掉云端已有的隐私文件
    let res3 = await runCmd(`git${authArg} push -u origin main -f`);

    // 万一某些 Git 版本不认 http.extraheader，就用「一次性带 token 的 URL」重试。
    // 注意：这里刻意不加 -u，否则会把带 token 的地址写进 branch 配置
    if (!res3.success) {
      logs.push(`> 常规认证失败，改用备用认证方式重试...\n`);
      const bareUrl = String(config.repoUrl || '').trim()
        .replace(/^https?:\/\//i, '').replace(/^[^@\/]+@/, '').replace(/\.git$/i, '');
      const credPart = String(config.userName || '').trim()
        ? `${encodeURIComponent(String(config.userName).trim())}:${encodeURIComponent(safeToken)}`
        : safeToken;
      const tmpUrl = `https://${credPart}@${bareUrl}.git`;
      const res4 = await runCmd(`git -c credential.helper= push "${tmpUrl}" main -f`);
      if (res4.success) {
        res3 = res4;
      } else {
        res3.output = res3.output + '\n' + res4.output;
      }
    }

    let safeOutput = redactSecrets(res3.output, [safeToken]);
    logs.push(safeOutput + '\n');

    if (!res3.success) return res.json({ success: false, log: logs.join('\n') });

    // 💡 更新说明同步到仪表盘：每次推送覆盖上一条，只保留最新
    let noticeSaved = null;
    try {
      const notice = {
        text: updateNote,
        type: 'info',
        source: 'push',
        version: versionInfo.id,
        at: versionInfo.pushedAt
      };
      await fs.writeJson(path.join(PUBLIC_DIR, 'site-notice.json'), notice, { spaces: 2 });
      noticeSaved = notice;
      logs.push(`> 更新说明已同步到仪表盘\n`);
    } catch (e) {
      logs.push(`> 更新说明写入失败（不影响推送）: ${e.message}\n`);
    }

    const giteeHint = await readGiteeHint();

    // 💡 说明一下更新源归属：用户推的是自己的仓库，但「检测更新」仍走程序作者的发布仓，
    //    避免有人误以为推了自己的仓库就会从自己仓库拉新版本
    try {
      const ownRepo = parseRepoUrl(config.repoUrl);
      const upCfg = await readUpdateConfig();
      const isUpstream = ownRepo && upCfg.sources.some(
        (s) => s.repo.host === ownRepo.host && s.repo.repo.toLowerCase() === ownRepo.repo.toLowerCase()
      );
      if (!isUpstream) {
        logs.push('\n[说明] 本次推送的是你自己的仓库，仅用于发布你的站点内容；\n');
        logs.push('       「检测更新」仍从程序作者的发布仓库获取新版本，两者互不影响。\n');
      }
    } catch (e) { /* 说明信息失败不影响推送结果 */ }
    logs.push(`\n[SUCCESS] 代码推送成功（私人文章和设定已安全过滤）！\n`);
    if (giteeHint) {
      logs.push(`[TODO] 版本 ${versionInfo.id} 已上 GitHub，请记得同步 Gitee：\n`);
      logs.push(`       ${giteeHint.repoUrl}\n`);
      logs.push(`       （仓库页 → 管理 → 仓库镜像管理 → 手动同步）\n`);
    }
    res.json({ success: true, log: logs.join('\n'), versionId: versionInfo.id, gitee: giteeHint, notice: noticeSaved });
  } catch (error) {
    logs.push(`[ERROR] 执行异常: ${error.message}\n`);
    res.json({ success: false, log: logs.join('\n') });
  }
});

// ================= 💡 检测并拉取 GitHub 更新 =================
app.get('/api/git/check-update', async (req, res) => {
  // 💡 没有 git-config.json（例如朋友那边没有 Token）时，自动改走匿名更新检查：
  //    只读 update-config.json 里的公开仓库地址，不需要任何凭据。
  if (!fs.existsSync(GIT_CONFIG_FILE)) return anonymousCheckUpdate(res);

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { cwd: __dirname, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  try {
    const config = await fs.readJson(GIT_CONFIG_FILE);
    const safeToken = String(config.token || '').trim();
    const authArg = basicAuthHeaderArg(safeToken);

    // 确保连接到正确的仓库（remote 只存干净地址，token 走请求头）
    await sanitizeOriginRemote(runCmd, config.repoUrl);

    // 拉取远程分支信息（只拉取不合并）
    const fetchRes = await runCmd(`git${authArg} fetch origin main`);
    if (!fetchRes.success) return res.json({ success: false, error: '拉取远程信息失败，请检查网络或 Token：' + redactSecrets(fetchRes.output, [safeToken]) });

    // 检查落后多少个 commit
    const countRes = await runCmd('git rev-list HEAD...origin/main --count');
    const count = parseInt(countRes.output.trim(), 10);

    if (count > 0) {
      // 有更新，获取更新日志
      const logRes = await runCmd('git log HEAD..origin/main --pretty=format:"%h - %s (%cr)"');
      res.json({ success: true, hasUpdate: true, count, logs: logRes.output.split('\n') });
    } else {
      res.json({ success: true, hasUpdate: false, count: 0, logs: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/git/pull', async (req, res) => {
  // 💡 没有 git-config.json（朋友那边没 Token）时，别报错卡死：
  //    老版本后台的「更新」按钮调的就是这个接口，直接转交给匿名 zip 更新
  if (!fs.existsSync(GIT_CONFIG_FILE)) return res.redirect(302, '/api/update/zip');

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { cwd: __dirname, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  let logs = [];
  try {
    const config = await fs.readJson(GIT_CONFIG_FILE);
    const safeToken = String(config.token || '').trim();
    const authArg = basicAuthHeaderArg(safeToken);

    // remote 只存干净地址，token 走一次性请求头
    await sanitizeOriginRemote(runCmd, config.repoUrl);
    
    logs.push('> 正在暂存本地修改（防止冲突）...');
    await runCmd('git add .');
    await runCmd('git stash');
    
    logs.push('> 正在拉取远程最新代码...');
    const pullRes = await runCmd(`git${authArg} pull origin main`);
    
    logs.push('> 正在恢复你的本地文件...');
    const popRes = await runCmd('git stash pop');
    
    if (pullRes.success) {
      res.json({ success: true, log: logs.join('\n') + '\n' + redactSecrets(pullRes.output, [safeToken]) + '\n' + redactSecrets(popRes.output, [safeToken]) });
    } else {
      res.json({ success: false, error: redactSecrets(pullRes.output, [safeToken]) });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
// ================= 防吃书一致性校验接口 (智能模糊匹配版) =================
app.get('/api/audit/check', async (req, res) => {
  try {
    const conflicts = [];
    const charFile = path.join(PUBLIC_DIR, 'characters.json');
    
    if (!fs.existsSync(charFile)) {
      return res.json({ conflicts: [] });
    }

    const characters = await fs.readJson(charFile);
    const deadCharacters = characters.filter(c => c.status === 'dead' && c.deathChapter);

    if (deadCharacters.length === 0) {
      return res.json({ conflicts: [], message: '没有已标记死亡且填写了死亡章节的角色。' });
    }

    const allChapters = [];
    const collectChapters = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith('.') || file === 'inbox.json') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          collectChapters(fullPath);
        } else if (file.endsWith('.md')) {
          allChapters.push({
            fileName: file.replace('.md', ''),
            fullPath: fullPath,
            relativePath: path.relative(LIBRARY_DIR, fullPath).replace(/\\/g, '/').replace('.md', '')
          });
        }
      }
    };
    collectChapters(LIBRARY_DIR);
    
    allChapters.sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-CN', { numeric: true }));

    const extractNumber = (str) => {
      if (!str) return null;
      const match = str.match(/\d+/);
      if (match) return parseInt(match[0], 10);
      
      const cnNums = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
      for (let key in cnNums) {
        if (str.includes(key)) {
          if (key === '十' && str.indexOf('十') > 0) return 20; 
          return cnNums[key];
        }
      }
      return null;
    };

    deadCharacters.forEach(char => {
      const deathNum = extractNumber(char.deathChapter);
      let deathIdx = -1;

      if (deathNum !== null) {
        deathIdx = allChapters.findIndex(ch => extractNumber(ch.fileName) === deathNum);
      } 
      
      if (deathIdx === -1) {
        deathIdx = allChapters.findIndex(ch => ch.fileName.includes(char.deathChapter));
      }

      if (deathIdx === -1) return; 

      for (let i = deathIdx + 1; i < allChapters.length; i++) {
        const chapter = allChapters[i];
        const content = fs.readFileSync(chapter.fullPath, 'utf-8');
        
        if (content.includes(char.name)) {
          conflicts.push({
            character: char.name,
            deathTime: char.deathChapter,
            errorType: '死后复活',
            fileName: chapter.fileName,
            filePath: chapter.relativePath
          });
        }
      }
    });

    res.json({ conflicts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ================= 版权保护与系统控制接口 =================
const PROTECTION_CONFIG_FILE = path.join(PUBLIC_DIR, 'protection-config.json');
const SITE_NOTICE_FILE = path.join(PUBLIC_DIR, 'site-notice.json'); // 💡 新增首页提示文件

// 1. 读取/保存保护配置
app.get('/api/protection/config', async (req, res) => {
  if (!fs.existsSync(PROTECTION_CONFIG_FILE)) {
    // 💡 全新安装：作者名和版权文案留空，界面上显示「自定义」，等用户自己填
    await fs.writeJson(PROTECTION_CONFIG_FILE, {
      enableNovelSync: true, 
      enableWatermark: true, 
      authorName: '', 
      enableAntiCopy: true, 
      copyrightText: '',
      targetWords: 0,
      lastCertifiedMilestone: 0 // 💡 新增：记录上次提醒的里程碑（0代表没提示过，1代表十万字提示过，2代表二十万字...）
    }, { spaces: 2 });
  }
  res.json(await fs.readJson(PROTECTION_CONFIG_FILE));
});

app.post('/api/protection/config', async (req, res) => {
  await fs.writeJson(PROTECTION_CONFIG_FILE, req.body, { spaces: 2 });
  res.json({ success: true });
});

// 2. 💡 新增：精准统计小说字数（仅统计 library 目录，剔除符号）
app.get('/api/protection/stats', async (req, res) => {
  try {
    let totalWords = 0;
    let chapterCount = 0;
    
    const countWords = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          countWords(fullPath); 
        } else if (file.endsWith('.md')) {
          const rawContent = fs.readFileSync(fullPath, 'utf-8');
          let cleanText = rawContent
            .replace(/<[^>]+>/g, '')                  
            .replace(/!\[.*?\]\(.*?\)/g, '')          
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')       
            .replace(/[#*_`~=\-|>\s\n\r]/g, '');     
          totalWords += cleanText.length;
          chapterCount++;
        }
      }
    };
    countWords(LIBRARY_DIR);
    res.json({ totalWords, chapterCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 💡 新增：读取/保存首页系统提示
app.get('/api/site-notice', async (req, res) => {
  if (!fs.existsSync(SITE_NOTICE_FILE)) {
    await fs.writeJson(SITE_NOTICE_FILE, { text: '', type: 'info' }, { spaces: 2 });
  }
  res.json(await fs.readJson(SITE_NOTICE_FILE));
});

app.post('/api/site-notice', async (req, res) => {
  await fs.writeJson(SITE_NOTICE_FILE, req.body, { spaces: 2 });
  res.json({ success: true });
});

// 💡 零宽水印生成工具
const generateZeroWidthWatermark = (text) => {
  // ... 保持原有的水印生成逻辑不变 ...
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const binary = charCode.toString(2).padStart(16, '0');
    for (let bit of binary) {
      result += bit === '0' ? '\u200b' : '\u200c'; 
    }
  }
  return result + '\u200d'; 
};

// ================= 💡 一键导出纯净系统包 (包含运行环境，开箱即用) =================
app.get('/api/export/init', async (req, res) => {
  try {
    const tempDir = path.join(__dirname, '.temp_export_build');
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    const keepList = [
      'server.js', 'admin.html', 'package.json', 'package-lock.json', 
      'plugin', 'website', 
      '一键启动.vbs', 'start.bat', 'loading.html', 
      'icon.svg', 'icon3.ico', '幻想世界启动器.lnk'
    ];

    for (const item of keepList) {
      const srcPath = path.join(__dirname, item);
      const destPath = path.join(tempDir, item);
      if (!fs.existsSync(srcPath)) continue;

            if (item === 'website') {
        await fs.copy(srcPath, destPath, {
          filter: (src) => {
            // 1. 排除缓存和依赖
            if (src.includes('node_modules') || src.includes('.vitepress/dist') || src.includes('.vitepress/cache')) return false;
            if (src.includes('docs/public/assets')) return false;
            if (src.includes('site-icon')) return true; // 💡 允许导出网站的 Favicon 图标
            if (src.includes('docs/novel/chapters')) return false;
            
            // 2. 💡 核心保护：只保留系统自带模板，剔除你写的私人文章
            if (src.includes('website/docs') && src.endsWith('.md')) {
              const fileName = path.basename(src);
              // 允许导出的系统模板文件白名单
              const systemFiles = [
                'index.md', 'novel.md', 'timeline.md', 'characters.md', 
                'graph.md', 'finance.md', 'world-tree.md', 'map.md', 
                'plotline.md', 'audit.md', 'protection.md', 'github.md', 
                'home-editor.md', 'plugin-builder.md', 'diagnostic.md'
              ];
              // 如果你自己写的文章名字不在这个白名单里，直接跳过不打包
              if (!systemFiles.includes(fileName)) return false;
            }
            return true;
          }
        });
      }
    }

        // 2. 使用 fs-extra 复制 node_modules（开启 dereference 防止 Windows 软链接报错）
    const nmSrc = path.join(__dirname, 'node_modules');
    const nmDest = path.join(tempDir, 'node_modules');
    if (fs.existsSync(nmSrc)) {
      await fs.copy(nmSrc, nmDest, { dereference: true });
    }

    // 构建干净的空数据文件
    const publicDir = path.join(tempDir, 'website/docs/public');
    await fs.ensureDir(publicDir);
    await fs.writeJson(path.join(publicDir, 'characters.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'timeline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'graph.json'), { nodes: [], links: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'map.json'), { image: '', markers: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'world-tree.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'plotline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'finance.json'), {
      items: [], stocks: [], currencies: [{ symbol: 'Gold', name: '黄金', basePrice: 1, currentPrice: 1 }]
    }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'protection-config.json'), {
      enableNovelSync: true, enableWatermark: true, authorName: '新作者', enableAntiCopy: true, copyrightText: '请支持正版。', targetWords: 100000, lastCertifiedMilestone: 0
    }, { spaces: 2 });

    const chaptersDir = path.join(tempDir, 'website/docs/novel/chapters');
    await fs.ensureDir(chaptersDir);
    const libDir = path.join(tempDir, 'library');
    await fs.ensureDir(libDir);
    await fs.writeFile(path.join(libDir, '.gitkeep'), '');

    const zipName = `my-world-system-init.zip`;
    const zipPath = path.join(__dirname, zipName);
    
    await new Promise((resolve, reject) => {
      exec(`tar --force-local -a -c -f "${zipPath}" -C "${tempDir}" .`, { maxBuffer: 1024 * 1024 * 100 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await fs.remove(tempDir);
    res.download(zipPath, zipName, async () => { await fs.remove(zipPath); });

  } catch (error) {
    res.status(500).send('导出失败: ' + error.message);
  }
});

// ================= 💡 一键导出全站干净模板 (无 node_modules，适合开发者) =================
app.get('/api/export/template', async (req, res) => {
  try {
    const tempDir = path.join(__dirname, '.temp_export_build');
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    const keepList = [
      'server.js', 'admin.html', 'package.json', 'package-lock.json', 
      'plugin', 'website',
      '一键启动.vbs', 'start.bat', 'loading.html', 
      'icon.svg', 'icon3.ico', '幻想世界启动器.lnk'
    ];
    
    for (const item of keepList) {
      const srcPath = path.join(__dirname, item);
      const destPath = path.join(tempDir, item);
      if (!fs.existsSync(srcPath)) continue;

            if (item === 'website') {
        await fs.copy(srcPath, destPath, {
          filter: (src) => {
            // 1. 排除缓存和依赖
            if (src.includes('node_modules') || src.includes('.vitepress/dist') || src.includes('.vitepress/cache')) return false;
            if (src.includes('docs/public/assets')) return false;
            if (src.includes('docs/novel/chapters')) return false;
            
            // 2. 💡 核心保护：只保留系统自带模板，剔除你写的私人文章
            if (src.includes('website/docs') && src.endsWith('.md')) {
              const fileName = path.basename(src);
              // 允许导出的系统模板文件白名单
              const systemFiles = [
                'index.md', 'novel.md', 'timeline.md', 'characters.md', 
                'graph.md', 'finance.md', 'world-tree.md', 'map.md', 
                'plotline.md', 'audit.md', 'protection.md', 'github.md', 
                'home-editor.md', 'plugin-builder.md', 'diagnostic.md'
              ];
              // 如果你自己写的文章名字不在这个白名单里，直接跳过不打包
              if (!systemFiles.includes(fileName)) return false;
            }
            return true;
          }
        });
      }
    }

    // 构建干净的空数据文件
    const publicDir = path.join(tempDir, 'website/docs/public');
    await fs.ensureDir(publicDir);
    await fs.writeJson(path.join(publicDir, 'characters.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'timeline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'graph.json'), { nodes: [], links: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'map.json'), { image: '', markers: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'world-tree.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'plotline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'finance.json'), {
      items: [], stocks: [], currencies: [{ symbol: 'Gold', name: '黄金', basePrice: 1, currentPrice: 1 }]
    }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'protection-config.json'), {
      enableNovelSync: true, enableWatermark: true, authorName: '新作者', enableAntiCopy: true, copyrightText: '请支持正版。', targetWords: 100000, lastCertifiedMilestone: 0
    }, { spaces: 2 });

    await fs.emptyDir(path.join(tempDir, 'library'));
    await fs.ensureDir(path.join(tempDir, 'website/docs/novel/chapters'));

    const zipName = `my-world-system-template.zip`;
    const zipPath = path.join(__dirname, zipName);
    
    await new Promise((resolve, reject) => {
      exec(`tar -a -c -f "${zipPath}" -C "${tempDir}" .`, { maxBuffer: 1024 * 1024 * 100 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await fs.remove(tempDir);
    res.download(zipPath, zipName, async () => { await fs.remove(zipPath); });

  } catch (error) {
    res.status(500).send('导出失败: ' + error.message);
  }
});

// ================= 💡 插件与系统诊断接口 =================
const NAVIGATION_FILE = path.join(PUBLIC_DIR, 'navigation.json');

// 💡 系统内置插件的专属中文字典（图标 + 名称）
const systemPluginMap = {
  'dashboard': { name: '仪表盘', icon: '📊' },
  'writer': { name: '沉浸码字', icon: '✍️' },
  'timeline': { name: '时间线', icon: '⏳' },
  'characters': { name: '人物档案', icon: '👤' },
  'graph': { name: '关系图谱', icon: '🕸️' },
  'finance': { name: '金融中心', icon: '💰' },
  'world-tree': { name: '世界观树', icon: '🌍' },
  'map': { name: '世界地图', icon: '🗺️' },
  'epoch-map': { name: '纪元地图', icon: '🕰️' },
  'history': { name: '历史模拟插件', icon: '📜' },
  'plotline': { name: '剧情大纲', icon: '🎬' },
  'audit': { name: '防吃书校验', icon: '🕵️' },
  'protection': { name: '版权与目标', icon: '🎯' },
  'github': { name: '一键推送', icon: '🚀' },
  'home-editor': { name: '首页设计与导出', icon: '🎨' },
  'plugin-builder': { name: '插件工厂', icon: '🏭' },
  'diagnostic': { name: '环境检测', icon: '🩺' },
  'article': { name: '文章编辑', icon: '📝' }
};

// 1. 获取导航数据
// 💡 默认导航（含作用范围 scope）：
//    both=共用 / site=前台专用 / admin=后端专用 / hidden=都隐藏
function defaultNavigation() {
  return [
    { id: 'writer', title: '沉浸码字', desc: '系统内置', icon: '✍️', link: '/writer', isSystem: true, scope: 'both' },
    { id: 'plotline', title: '剧情大纲', desc: '系统内置', icon: '🎬', link: '/plotline', isSystem: true, scope: 'both' },
    { id: 'timeline', title: '时间线', desc: '系统内置', icon: '⏳', link: '/timeline', isSystem: true, scope: 'both' },
    { id: 'characters', title: '人物档案', desc: '系统内置', icon: '👤', link: '/characters', isSystem: true, scope: 'both' },
    { id: 'graph', title: '关系图谱', desc: '系统内置', icon: '🕸️', link: '/graph', isSystem: true, scope: 'both' },
    { id: 'finance', title: '金融中心', desc: '系统内置', icon: '💰', link: '/finance', isSystem: true, scope: 'both' },
    { id: 'world-tree', title: '世界观树', desc: '系统内置', icon: '🌍', link: '/world-tree', isSystem: true, scope: 'both' },
    { id: 'map', title: '世界地图', desc: '系统内置', icon: '🗺️', link: '/map', isSystem: true, scope: 'both' },
    { id: 'epoch-map', title: '纪元地图', desc: '系统内置', icon: '🕰️', link: '/epoch-map', isSystem: true, scope: 'both' },
    { id: 'audit', title: '防吃书校验', desc: '系统内置', icon: '🕵️', link: '/audit', isSystem: true, scope: 'admin' },
    { id: 'protection', title: '版权与目标', desc: '系统内置', icon: '🎯', link: '/protection', isSystem: true, scope: 'admin' },
    { id: 'github', title: '一键推送', desc: '系统内置', icon: '🚀', link: '/github', isSystem: true, scope: 'admin' },
    { id: 'home-editor', title: '首页设计与导出', desc: '系统内置', icon: '🎨', link: '/home-editor', isSystem: true, scope: 'admin' },
    { id: 'plugin-builder', title: '插件工厂', desc: '系统内置', icon: '🏭', link: '#', isSystem: true, scope: 'admin' },
    { id: 'novel', title: '小说书架', desc: '阅读你写下的故事。', icon: '📖', link: '/novel/', isSystem: true, scope: 'site' }
  ];
}

// 💡 把 scope 和 hideBackend/hideFrontend 对齐（老数据只有两个布尔值，这里自动补 scope）
function normalizeNavScopes(list) {
  let changed = false;
  (Array.isArray(list) ? list : []).forEach((n) => {
    if (!n) return;
    const valid = n.scope === 'both' || n.scope === 'site' || n.scope === 'admin' || n.scope === 'hidden';
    if (!valid) {
      const hb = !!n.hideBackend, hf = !!n.hideFrontend;
      n.scope = (hb && hf) ? 'hidden' : hb ? 'site' : hf ? 'admin' : 'both';
      changed = true;
    }
    n.hideBackend = (n.scope === 'site' || n.scope === 'hidden');
    n.hideFrontend = (n.scope === 'admin' || n.scope === 'hidden');
    if (n.id === 'plugin-builder') n.hideBackend = false;   // 工厂永久常驻后台
  });
  return changed;
}

// 💡 确保 navigation.json 存在：前端导航页直接读这个静态文件，
//    缺了它就会显示「没有任何导航数据」
async function seedNavigation() {
  if (fs.existsSync(NAVIGATION_FILE)) return;
  const list = defaultNavigation();
  normalizeNavScopes(list);
  await fs.writeJson(NAVIGATION_FILE, list, { spaces: 2 });
  console.log('[init] 已生成默认 navigation.json');
}
app.get('/api/navigation', async (req, res) => {
  await seedNavigation();

  
  let navList = await fs.readJson(NAVIGATION_FILE);
  
  // 💡 自动修复历史遗留的英文导航数据（把英文名全部覆盖为中文）
  let needSave = false;
  navList.forEach(n => {
    if (systemPluginMap[n.id]) {
      n.title = systemPluginMap[n.id].name;
      n.icon = systemPluginMap[n.id].icon;
      needSave = true;
    }
  });
  if (normalizeNavScopes(navList)) needSave = true;
  if (needSave) await fs.writeJson(NAVIGATION_FILE, navList, { spaces: 2 });
  
  res.json(navList);
});

// 2. 保存导航数据
app.post('/api/navigation', async (req, res) => {
  let navList = Array.isArray(req.body) ? req.body : [];
  normalizeNavScopes(navList);

  // 💡 前端可见的条目必须有对应页面：没有 website/docs/<slug>.md 就现场生成一份薄壳，
  //    否则前台点进去就是 VitePress 的 404（典型场景：先勾了「仅后台」后来又改成共用）
  const createdPages = [];
  const missingPlugins = [];
  for (const item of navList) {
    if (!item || item.hideFrontend) continue;
    let link = String(item.link || '').trim();
    if (!link.startsWith('/') || link === '/' || link === '#') continue;

    // 💡 链接规范化：/map.html、/plugin/map.html 指的是插件文件本身，
    //    前台并没有这个路由，统一纠正成 /<id>
    if (/\.html?$/i.test(link) || /^\/plugin\//i.test(link)) {
      if (!item.id) continue;
      link = '/' + String(item.id).trim();
      item.link = link;
    }

    const rawPath = link.split('?')[0];
    const isDirLink = rawPath.endsWith('/');          // /novel/ 这种目录式链接对应 index.md
    const rel = rawPath.replace(/^\//, '').replace(/\/+$/, '');
    if (!rel) continue;
    // 去掉误写的扩展名，避免生成 map.html.md 这种文件名
    const baseRel = rel.replace(/\.(html?|md|markdown)$/i, '');
    const docRel = isDirLink ? `${baseRel}/index.md` : `${baseRel}.md`;
    const docAbs = path.join(DOCS_DIR, docRel);
    if (fs.existsSync(docAbs)) continue;

    const pluginFile = path.join(__dirname, 'plugin', `${item.id}.html`);
    if (!fs.existsSync(pluginFile)) { missingPlugins.push(item.id); continue; }

    const md = `---
title: ${item.title || item.id}
aside: false
prev: false
next: false
---

<ClientOnly>
  <iframe src="http://localhost:3001/plugin/${item.id}.html?view=front" style="width: 100%; height: calc(100vh - 60px); border: none; border-radius: 8px;"></iframe>
</ClientOnly>
`;
    try {
      await fs.outputFile(docAbs, md, 'utf-8');
      createdPages.push(docRel);
      console.log('[nav] 已为前台补生成页面：' + docRel);
    } catch (e) { /* 忽略单个失败 */ }
  }
  // 🔒 插件工厂是后台的唯一入口，必须常驻后台：
  //    无论前端传什么，都强制 hideBackend = false；缺失就补一条。
  const builder = navList.find(n => n && n.id === 'plugin-builder');
  if (builder) {
    builder.hideBackend = false;
  } else {
    navList.unshift({
      id: 'plugin-builder', title: '插件工厂', icon: '🏭', desc: '自定义',
      link: '#', isSystem: true, hideBackend: false, hideFrontend: true
    });
  }
  await fs.writeJson(NAVIGATION_FILE, navList, { spaces: 2 });
  res.json({ success: true, createdPages, missingPlugins });
});

// 3. 获取已存在的插件列表（用于后台动态菜单）
app.get('/api/plugins/list', async (req, res) => {
  try {
    const pluginDir = path.join(__dirname, 'plugin');
    if (!fs.existsSync(pluginDir)) return res.json([]);
    
    // 读取导航配置，获取前/后台的显隐状态和顺序
    const navList = fs.existsSync(NAVIGATION_FILE) ? await fs.readJson(NAVIGATION_FILE) : [];
    
    // 获取物理目录下的所有 html 文件，并加上虚拟的 article
    const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.html'));
    let allPlugins = files.map(f => f.replace('.html', ''));
    allPlugins = [...new Set([...allPlugins, 'article', 'dashboard', 'plugin-builder'])];

    // 💡 自动注册：扫描到但导航里没有的插件（比如作者新加、更新后落到本地的），
    //    自动补进 navigation.json，否则它会被默认隐藏、后台看不到按钮。
    let navChanged = false;
    for (const id of allPlugins) {
      if (navList.findIndex(n => n.id === id) >= 0) continue;
      if (!systemPluginMap[id] && !files.includes(id + '.html')) continue;

      let title = systemPluginMap[id] ? systemPluginMap[id].name : '';
      const icon = systemPluginMap[id] ? systemPluginMap[id].icon : '🧩';
      if (!title) {
        // 从插件 html 的 <title> 里抠一个名字出来
        try {
          const html = fs.readFileSync(path.join(pluginDir, id + '.html'), 'utf-8');
          const t = html.match(/<title>([^<]+)<\/title>/i);
          title = t ? t[1].trim() : '';
        } catch (e) { /* ignore */ }
      }
      if (!title) title = id;

      navList.push({
        id: id,
        title: title,
        desc: '自动注册的插件',
        icon: icon,
        link: '#',
        isSystem: !!systemPluginMap[id],
        hideFrontend: true,   // 只进后台，不默认暴露到前台导航
        hideBackend: false,
        autoRegistered: true
      });
      navChanged = true;
      console.log(`[PLUGIN] 自动注册新插件: ${id} → ${title}`);
    }
    if (navChanged) {
      try { await fs.writeJson(NAVIGATION_FILE, navList, { spaces: 2 }); } catch (e) { /* ignore */ }
    }

    const plugins = allPlugins.map(id => {
      const isSys = !!systemPluginMap[id];
      const navIdx = navList.findIndex(n => n.id === id);
      const navItem = navIdx >= 0 ? navList[navIdx] : null;
      
      // 获取中文字典里的名字和图标
      let name = id.toUpperCase() + ' 插件';
      let icon = '🧩';
      if (isSys) {
        name = systemPluginMap[id].name;
        icon = systemPluginMap[id].icon;
      }
      // 导航里改过的标题优先（否则非系统插件永远显示 "XXX 插件"）
      if (navItem && navItem.title) name = navItem.title;
      if (navItem && navItem.icon) icon = navItem.icon;
      
      return {
        id: id,
        name: name,
        icon: icon,
        isSystem: isSys,
        // 如果不在 navList 里，说明还没被注册进导航，默认处于隐藏状态
        hideFrontend: navItem ? !!navItem.hideFrontend : true,
        hideBackend: navItem ? !!navItem.hideBackend : true,
        navIdx: navIdx >= 0 ? navIdx : 9999 // 未注册的排在最后
      };
    });
    
    // 按照 navIdx 排序，这样后台右侧列表的顺序就完美对齐了顶部导航
    plugins.sort((a, b) => a.navIdx - b.navIdx);
    
    res.json(plugins);
  } catch (error) { 
    console.error('获取插件列表失败:', error);
    res.json([]); 
  }
});

// 4. 创建或读取自定义插件
const SAFE_PLUGIN_ID = /^[a-zA-Z0-9_-]+$/; // 💡 新增：防止路径穿越攻击

app.get('/api/plugins/file', async (req, res) => {
  const id = String(req.query.id || '');
  if (!SAFE_PLUGIN_ID.test(id)) return res.status(400).json({ error: '非法插件 ID' });
  
  const filePath = path.join(__dirname, 'plugin', `${id}.html`);
  if (fs.existsSync(filePath)) res.json({ content: await fs.readFile(filePath, 'utf-8') });
  else res.json({ content: '' });
});

app.post('/api/plugins/file', async (req, res) => {
  try {
    const id = String(req.body.id || '');
    if (!SAFE_PLUGIN_ID.test(id)) return res.status(400).json({ success: false, error: '非法插件 ID' });
    
    const filePath = path.join(__dirname, 'plugin', `${id}.html`);
    await fs.writeFile(filePath, req.body.content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 💡 新增：彻底删除插件接口
app.post('/api/plugins/delete', async (req, res) => {
  try {
    const id = String(req.body.id || '');
    if (!SAFE_PLUGIN_ID.test(id)) {
      return res.status(400).json({ success: false, error: '非法插件 ID' });
    }
    
    const filePath = path.join(__dirname, 'plugin', `${id}.html`);
    
    // 1. 删除物理文件
    if (fs.existsSync(filePath)) {
      await fs.remove(filePath);
    }

    // 2. 从导航配置中移除
    if (fs.existsSync(NAVIGATION_FILE)) {
      let navList = await fs.readJson(NAVIGATION_FILE);
      const initialLength = navList.length;
      navList = navList.filter(n => n.id !== id);
      
      if (navList.length !== initialLength) {
        await fs.writeJson(NAVIGATION_FILE, navList, { spaces: 2 });
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. 💡 环境疑难解答诊断
app.get('/api/diagnostic', async (req, res) => {
  const results = [];
  const check = (name, status, msg) => results.push({ name, status, msg });

  check('Node.js 运行环境', 'ok', `版本: ${process.version}`);

  try {
    const gitVersion = await new Promise((resolve, reject) => {
      exec('git --version', (err, stdout) => err ? reject(err) : resolve(stdout.trim()));
    });
    check('Git 命令行', 'ok', gitVersion);
  } catch (e) {
    check('Git 命令行', 'error', '未安装 Git 或未配置系统环境变量！');
  }

  if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    check('核心依赖包', 'ok', 'node_modules 目录已存在');
  } else {
    check('核心依赖包', 'error', '缺失 node_modules，请运行 npm install');
  }

  const checkPort = (port) => new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE' ? 'occupied' : 'error'));
    server.once('listening', () => { server.close(); resolve('free'); });
    server.listen(port);
  });
  
  const port5173 = await checkPort(5173);
  check('前台端口 5173', port5173 === 'occupied' ? 'ok' : 'warning', port5173 === 'occupied' ? '前台服务正在运行' : '前台未启动');
  check('后台端口 3001', 'ok', '当前诊断接口就在此端口运行，正常');

  res.json(results);
});
// ================= 💡 无 Git 直接下载更新 (ZIP) =================
const https = require('https');


// 免 Token 的检测更新入口（浏览器直接打开也行，方便没有后台界面的老版本调用）
app.get('/api/update/check', async (req, res) => anonymousCheckUpdate(res));

// ================= 💡 更新任务（带实时进度，前端轮询取状态） =================
let updateJob = {
  id: 0, running: false, stage: 'idle', source: '', percent: null,
  message: '', logs: [], startedAt: 0, finishedAt: 0, ok: false, error: '',
  via: '', backup: '', skipped: [], speed: 0, file: '', filePercent: null
};

function updateJobReset() {
  updateJob = {
    id: Date.now(), running: true, stage: 'start', source: '', percent: null,
    message: '准备更新…', logs: [], startedAt: Date.now(), finishedAt: 0,
    ok: false, error: '', via: '', backup: '', skipped: [], speed: 0, file: '', filePercent: null
  };
}
function updateJobSet(patch) { Object.assign(updateJob, patch); }
function updateJobLog(msg) {
  let text = String(msg == null ? '' : msg);
  if (text.length > 200) text = text.slice(0, 200) + '…';
  updateJob.logs.push(text);
  if (updateJob.logs.length > 40) updateJob.logs.shift();
  updateJob.message = text;
}
function updateJobSnapshot() {
  return {
    id: updateJob.id,
    running: updateJob.running,
    stage: updateJob.stage,
    source: updateJob.source,
    percent: updateJob.percent,
    message: updateJob.message,
    logs: updateJob.logs.slice(-10),
    elapsed: updateJob.startedAt ? Math.round((Date.now() - updateJob.startedAt) / 1000) : 0,
    ok: updateJob.ok,
    error: updateJob.error,
    via: updateJob.via,
    backup: updateJob.backup,
    skipped: updateJob.skipped,
    speed: updateJob.speed || 0,
    file: updateJob.file || '',
    filePercent: updateJob.filePercent,
    finishedAt: updateJob.finishedAt
  };
}

// 按文件清单逐个拉取（不依赖 zip 归档：Gitee 的归档下载已经需要登录）
async function applyRawUpdate(sources) {
  const FILE_LIST = 'update-files.txt';
  const tried = [];
  let chosen = null;

  for (const s of sources) {
    for (const base of rawBaseUrls(s.repo, s.branch)) {
      try {
        const buf = await httpsGetBuffer(`${base}/${FILE_LIST}`, 15000);
        const text = buf.toString('utf8');
        const list = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
        if (!list.length || list.some((x) => x.indexOf('/') === -1 && !/\.\w+$/.test(x))) {
          throw new Error('清单格式异常');
        }
        chosen = { base, source: s, list };
        break;
      } catch (e) {
        tried.push(`${base} → ${e.message}`);
      }
    }
    if (chosen) break;
  }

  if (!chosen) throw new Error('所有通道都取不到文件清单：' + tried.join('  |  '));

  // 所有可用基底：主通道失败时轮换，单个文件也能换源重试
  const bases = [];
  for (const s of sources) {
    for (const b of rawBaseUrls(s.repo, s.branch)) {
      if (!bases.includes(b)) bases.push(b);
    }
  }
  if (!bases.includes(chosen.base)) bases.unshift(chosen.base);

  const total = chosen.list.length;
  const deadBases = new Set();   // 本次更新里确定不可用的源（证书错误 / 连续失败）
  let pending = chosen.list.filter((r) => r && r.indexOf('..') === -1);
  const MAX_ROUNDS = 4;   // 首次 + 3 次重试
  updateJobLog(`✅ 通道可用（${chosen.source.repo.host}），共 ${total} 个文件，开始下载…`);

  for (let round = 1; round <= MAX_ROUNDS && pending.length; round++) {
    if (round > 1) {
      updateJobLog(`第 ${round - 1} 次重试：还有 ${pending.length} 个文件没下到…`);
      await new Promise((r) => setTimeout(r, 800));   // 稍等再重试，避开瞬时抖动
    }
    const still = [];
    for (let k = 0; k < pending.length; k++) {
      const rel = pending[k];
      const relUrl = rel.split('\\').join('/');
      let ok = false;
      for (let bi = 0; bi < bases.length; bi++) {
        const base = bases[bi];
        if (deadBases.has(base)) continue;
        const hostTag = String(base).replace(/^https:\/\//, '').split('/')[0];
        try {
          updateJobSet({ file: rel, speed: 0, filePercent: 0 });
          const buf = await httpsGetBuffer(`${base}/${relUrl}`, 30000, {
            onProgress: (info) => {
              updateJobSet({
                speed: Math.round(info.speed || 0),
                filePercent: info.total ? Math.round((info.received / info.total) * 100) : null
              });
            }
          });
          if (!buf || !buf.length) throw new Error('空文件');
          await fs.outputFile(path.join(__dirname, rel), buf);
          ok = true;
          break;
        } catch (e) {
          // 💡 卡住 / 太慢 / 报错 → 记一条日志再换下一个源
          const msg = String((e && e.message) || e);
          if (/certificate|self.signed|CERT_|unable to verify/i.test(msg)) {
            if (!deadBases.has(base)) {
              deadBases.add(base);
              updateJobLog(`⚠ ${hostTag} 证书校验失败，本次更新跳过这个源`);
            }
          } else {
            updateJobLog(`⚠ ${rel} 从 ${hostTag} 失败：${msg}`);
          }
        }
      }
      if (!ok) still.push(rel);
      updateJobSet({ percent: Math.round(((total - pending.length + k + 1) / total) * 100), speed: 0, filePercent: 100 });
    }
    pending = still;
  }

  if (pending.length) {
    // 💡 有文件始终下不下来：整次更新算失败（不记录版本号，让用户重试）
    throw new Error(`${pending.length} 个文件多次重试仍下载失败：${pending.slice(0, 5).join(' / ')}`);
  }
  return { base: chosen.base, source: chosen.source, total: total, failed: [] };
}

// 客户端要更新的文件白名单：显式枚举目录，避免把备份、日志、私人 md 带出去
async function collectUpdateFiles() {
  // 💡 全新电脑安装时，启动所需的一切都要能下载到：
  //    server/插件/站点 + 启动脚本（start.bat / loading.html / icon3.ico）。
  //    注意：清单里只放纯 ASCII 文件名——批处理按 GBK 读清单，
  //    中文名会变乱码（「一键启动.vbs」由安装脚本用百分号编码单独下载）。
  const roots = ['server.js', 'admin.html', 'package.json', 'version.json',
                 'update-config.json', 'start.vbs', 'start.bat', 'loading.html', 'icon3.ico',
                 'plugin', 'website'];
  const out = [];

  const skipPath = (rel) => {
    const p = String(rel).replace(/\\/g, '/');
    if (p.indexOf('node_modules/') > -1) return true;
    if (p.indexOf('website/.vitepress/cache') === 0) return true;
    if (p.indexOf('website/.vitepress/dist') === 0) return true;
    if (p.indexOf('website/docs/public/') === 0) return true;
    if (p.indexOf('website/docs/novel/chapters/') === 0) return true;
    if (p.indexOf('website/docs/assets/') === 0) return true;
    // 💡 页面 md 分两类：
    //    根级（index.md 除外）= 站点页面薄壳，新插件依赖它们，必须同步
    //    子目录（法律/国家/武器/novel）= 真正的设定文章，不外发
    // 💡 组件目录必须整体放行：页面 md 里 import 了 ../components/*.vue，
    //    缺任何一个 VitePress 都会报 Failed to resolve import
    if (p === 'website/docs/components' || p.indexOf('website/docs/components/') === 0) return false;
    if (/^website\/docs\/[^\/]+\.md$/i.test(p)) {
      return /^website\/docs\/index\.md$/i.test(p);   // 只有 index.md 跳过（各人首页不同）
    }
    if (/^website\/docs\/.+\.md$/i.test(p)) return true;
    if (/^website\/docs\/.*\.json$/i.test(p)) return true; // 站点数据（纪元地图等）也不外发
    // 💡 其余 website/docs 下的东西（.gitkeep、图片、用户其它文件）一律不外发：
    //    一是属于各人内容，二是中文路径塞进清单会让 .bat 按 GBK 读成乱码
    if (p.indexOf('website/docs/') === 0) return true;
    if (/\.log$/i.test(p)) return true;
    if (/\.zip$/i.test(p)) return true;
    return false;
  };

  const walk = async (abs, rel) => {
    let st;
    try { st = await fs.stat(abs); } catch (e) { return; }
    if (st.isDirectory()) {
      let entries = [];
      try { entries = await fs.readdir(abs); } catch (e) { return; }
      for (const name of entries) {
        if (name === 'node_modules') continue;
        const childRel = rel ? `${rel}/${name}` : name;
        if (skipPath(childRel)) continue;
        await walk(path.join(abs, name), childRel);
      }
    } else if (!skipPath(rel)) {
      out.push(rel);
    }
  };

  for (const r of roots) await walk(path.join(__dirname, r), r);
  return out.sort();
}

async function runUpdateFlow() {
  // 💡 多源更新：按 update-config.json 里 sources 的顺序尝试
  const upCfg = await readUpdateConfig();
  const sources = upCfg.sources.slice();
  if (!sources.length && fs.existsSync(GIT_CONFIG_FILE)) {
    try {
      const r = parseRepoUrl((await fs.readJson(GIT_CONFIG_FILE)).repoUrl);
      if (r) sources.push({ repoUrl: r.pageUrl, branch: 'main', lastCommit: '', repo: r });
    } catch (e) { /* ignore */ }
  }
  if (!sources.length) throw new Error('未配置更新源：请在 update-config.json 的 sources 里填写仓库地址（GitHub / Gitee 公开仓库，不需要 Token）');

  const filesToUpdate = ['server.js', 'admin.html', 'package.json', 'version.json', 'plugin', 'website'];
  const zipPath = path.join(__dirname, `update-${Date.now()}.zip`);
  const tempDir = path.join(__dirname, '.temp_update');

  // 0. 先备份（不管走哪条通道，都要在被覆盖前备份）
  updateJobSet({ stage: 'backup' });
  updateJobLog('正在备份当前代码…');
  let backup = { dir: '', saved: [] };
  try {
    backup = await backupBeforeUpdate(filesToUpdate);
  } catch (e) {
    backup = { dir: '', saved: [], error: e.message };
  }

  const failures = [];
  let applied = null;

  // 1. 首选：按文件清单逐个下载（Gitee raw / GitHub raw / jsDelivr 均可）
  updateJobSet({ stage: 'download', source: sources[0].repo.host, percent: 0 });
  updateJobLog('正在读取文件清单…');
  try {
    const r = await applyRawUpdate(sources);
    applied = { source: r.source, via: 'raw' };
  } catch (e) {
    failures.push('raw: ' + e.message);
    updateJobLog('⚠ 按文件更新失败，改用压缩包方式…');
  }

  // 2. 兜底：老的「下载 zip 归档」方式
  if (!applied) {
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const host = s.repo.host;
      updateJobSet({ stage: 'download', source: host, percent: null });
      updateJobLog(`正在从 ${host} 下载压缩包…`);

      const onProgress = (p) => {
        if (typeof p.percent === 'number') {
          updateJobSet({ percent: Math.max(0, Math.min(100, Math.round(p.percent))) });
        } else if (p.total > 0) {
          updateJobSet({ percent: Math.max(0, Math.min(100, Math.round((p.received / p.total) * 100))) });
        }
      };

      try {
        const urls = buildArchiveUrls(s.repo, s.branch);
        const dl = await downloadWithFallback(urls, zipPath, onProgress);
        applied = { source: s, via: dl.via };
        updateJobSet({ percent: 100 });
        updateJobLog(`✅ 下载成功（${host}，通道 ${dl.via}）`);
        break;
      } catch (e) {
        failures.push(`${host}: ${e.message}`);
        updateJobSet({ percent: null });
        const next = sources[i + 1];
        updateJobLog(`⚠ ${host} 下载失败：${e.message}` + (next ? `，正在切换到 ${next.repo.host}…` : ''));
        try { await fs.remove(zipPath); } catch (err) { /* ignore */ }
      }
    }
    if (!applied) throw new Error('所有更新源都失败：' + failures.join('  |  '));

    // 解压 + 覆盖
    updateJobSet({ stage: 'extract', percent: null });
    updateJobLog('正在解压…');
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);
    await new Promise((resolve, reject) => {
      exec(`tar -xf "${zipPath}" -C "${tempDir}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const dirs = await fs.readdir(tempDir);
    const sourceDir = path.join(tempDir, dirs[0]);

    updateJobSet({ stage: 'apply' });
    updateJobLog('正在覆盖系统文件…');
    for (const item of filesToUpdate) {
      const src = path.join(sourceDir, item);
      const dest = path.join(__dirname, item);
      if (!fs.existsSync(src)) continue;
      if (item === 'website') {
        await fs.copy(src, dest, {
          filter: (s) => !s.includes('docs/public') && !s.includes('docs/novel/chapters')
        });
      } else {
        await fs.copy(src, dest);
      }
    }

    await fs.remove(tempDir);
    await fs.remove(zipPath);
  }

  // 3. 记录各源的最新 commit，作为 commit 比对模式的基准
  //    💡 只有真正成功才记录：失败时保持旧版本号不变，避免"看起来已更新"
  if (!applied || (applied.failed && applied.failed.length)) {
    updateJobSet({ stage: 'error', running: false, ok: false, error: '更新失败，请重试', finishedAt: Date.now() });
    updateJobLog('❌ 更新失败，请重试（版本号保持不变）');
    throw new Error('更新失败，请重试');
  }
  updateJobSet({ stage: 'record' });
  updateJobLog('正在记录版本信息…');
  const updated = [];
  for (const s of sources) {
    let sha = '';
    try { sha = (await fetchLatestCommit(s.repo, s.branch)).sha; } catch (e) { sha = ''; }
    updated.push({ repoUrl: s.repoUrl, branch: s.branch, lastCommit: sha || s.lastCommit || '' });
  }
  try {
    await fs.writeJson(UPDATE_CONFIG_FILE, { sources: updated }, { spaces: 2 });
  } catch (e) { /* ignore */ }

  updateJobSet({
    stage: 'done', running: false, ok: true, percent: 100,
    finishedAt: Date.now(), via: applied.via, backup: backup.dir, skipped: failures
  });
  updateJobLog(`✅ 更新完成（来源 ${applied.source.repo.host}，方式 ${applied.via}）`);
}

// 启动更新任务（立即返回，前端轮询 /api/update/status）
app.get('/api/update/start', async (req, res) => {
  if (updateJob.running) return res.json({ success: true, job: updateJobSnapshot(), already: true });

  updateJobReset();
  updateJobLog('准备更新…');
  res.json({ success: true, job: updateJobSnapshot() });

  runUpdateFlow().catch((e) => {
    updateJobSet({ running: false, ok: false, error: e.message, stage: 'error', finishedAt: Date.now() });
    updateJobLog('❌ ' + e.message);
  });
});

// 查询更新进度
app.get('/api/update/status', (req, res) => {
  res.json({ success: true, job: updateJobSnapshot() });
});

// 老的「一次性」更新接口（兼容 .bat 和旧客户端）：跑完整流程再返回
app.get('/api/update/zip', async (req, res) => {
  try {
    if (updateJob.running) {
      const t0 = Date.now();
      while (updateJob.running && Date.now() - t0 < 300000) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      updateJobReset();
      try {
        await runUpdateFlow();
      } catch (e) {
        updateJobSet({ running: false, ok: false, error: e.message, stage: 'error', finishedAt: Date.now() });
      }
    }

    if (updateJob.ok) {
      return res.json({
        success: true,
        message: `更新完成啦（来源 ${updateJob.source}，通道 ${updateJob.via}）✨ 关掉浏览器重新进入就能看到新版本；没变化的话把后台窗口也关掉重新启动一下。你的数据都好好留着呢～`,
        source: updateJob.source,
        via: updateJob.via,
        backup: updateJob.backup,
        skipped: updateJob.skipped
      });
    }
    return res.status(500).json({ success: false, error: updateJob.error || '更新失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= 首页 Markdown 生成器（后台可配置） =================
const HOME_DEFAULTS = {
  // 💡 全新安装的首页从空白开始，不预填作者的「幻想域」内容
  siteTitle: '我的幻想世界',
  siteIcon: '/icon.svg',
  name: '我的幻想世界',
  text: '',
  tagline: '在这里搭起你自己的世界。',
  btn1Text: '',
  btn1Link: '',
  btn2Text: '',
  btn2Link: '',
  features: [],
  modulesTitle: '世界导览',
  modulesLead: '',
  modules: [],
  routesTitle: '入门路线',
  routesLead: '',
  routes: [],
  navEntry: {
    enabled: false,
    icon: '🧭',
    text: '快捷导航中心',
    desc: '',
    link: '/navigation'
  }
};

const HOME_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function homeEsc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, (c) => HOME_ESCAPES[c]);
}
function yamlEsc(v) {
  return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildHomeMarkdown(raw) {
  const hd = Object.assign({}, HOME_DEFAULTS, raw || {});

  const acts = [];
  if (String(hd.btn1Text || '').trim()) {
    acts.push(`    - theme: brand\n      text: "${yamlEsc(hd.btn1Text)}"\n      link: "${hd.btn1Link || '#'}"`);
  }
  if (String(hd.btn2Text || '').trim()) {
    acts.push(`    - theme: alt\n      text: "${yamlEsc(hd.btn2Text)}"\n      link: "${hd.btn2Link || '#'}"`);
  }
  const actionsYaml = acts.length ? `  actions:\n${acts.join('\n')}` : '';
  const featYaml = (Array.isArray(hd.features) ? hd.features : [])
    .filter((f) => f && String(f.title || '').trim())
    .map((f) => `  - title: "${yamlEsc(f.title)}"\n    details: "${yamlEsc(f.desc)}"`)
    .join('\n');

  // ---------- 世界导览卡片 ----------
  const modules = (Array.isArray(hd.modules) ? hd.modules : []).filter((m) => m && String(m.title || '').trim());
  const moduleCards = modules.map((m) => [
    `    <a class="home-card" href="${homeEsc(m.href || '#')}">`,
    `      <span class="home-card-icon">${homeEsc(m.icon || '•')}</span>`,
    `      <span class="home-card-body">`,
    `        <span class="home-card-name">${homeEsc(m.title)}</span>`,
    `        <span class="home-card-desc">${homeEsc(m.desc)}</span>`,
    `      </span>`,
    `    </a>`
  ].join('\n')).join('\n');

  const modulesSection = modules.length ? `<section class="home-section">
  <h2 class="home-heading">${homeEsc(hd.modulesTitle || '世界导览')}</h2>
  <p class="home-lead">${homeEsc(hd.modulesLead)}</p>
  <div class="home-grid">
${moduleCards}
  </div>
</section>` : '';

  // ---------- 入门路线 ----------
  const routes = (Array.isArray(hd.routes) ? hd.routes : []).filter((r) => r && String(r.name || '').trim());
  const routeCards = routes.map((r, i) => [
    `    <div class="home-route">`,
    `      <div class="home-route-step">${homeEsc(r.step || String(i + 1).padStart(2, '0'))}</div>`,
    `      <div class="home-route-name">${homeEsc(r.name)}</div>`,
    `      <p class="home-route-desc">${homeEsc(r.desc)}</p>`,
    `      <a class="home-route-link" href="${homeEsc(r.href || '#')}">${homeEsc(r.linkText || '进入 →')}</a>`,
    `    </div>`
  ].join('\n')).join('\n');

  const routesSection = routes.length ? `<section class="home-section">
  <h2 class="home-heading">${homeEsc(hd.routesTitle || '入门路线')}</h2>
  <p class="home-lead">${homeEsc(hd.routesLead)}</p>
  <div class="home-route-grid">
${routeCards}
  </div>
</section>` : '';

  // ---------- 导航页入口（可关闭） ----------
  const ne = Object.assign({}, HOME_DEFAULTS.navEntry, hd.navEntry || {});
  const entryHtml = ne.enabled === false ? '' : `<a class="home-entry" href="${homeEsc(ne.link || '/navigation')}">
  <span class="home-entry-icon">${homeEsc(ne.icon || '🧭')}</span>
  <span class="home-entry-body">
    <span class="home-entry-name">${homeEsc(ne.text || '快捷导航中心')}</span>
    <span class="home-entry-desc">${homeEsc(ne.desc)}</span>
  </span>
  <span class="home-entry-go">进入 →</span>
</a>`;

  const bodyHtml = `
${modulesSection}
${routesSection}
${entryHtml}

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
`;

  const fullMd = `---
layout: home
aside: false
outline: false

hero:
  name: "${yamlEsc(hd.name)}"
  text: "${yamlEsc(hd.text)}"
  tagline: "${yamlEsc(hd.tagline)}"
${actionsYaml}
features:
${featYaml}
---
${bodyHtml}`;

  return fullMd;
}

// 生成并写入 website/docs/index.md
app.post('/api/generate-index-md', async (req, res) => {
  try {
    const configPath = path.join(PUBLIC_DIR, 'home-config.json');
    const hd = fs.existsSync(configPath) ? await fs.readJson(configPath) : {};
    const fullMd = buildHomeMarkdown(hd);
    await fs.writeFile(path.join(DOCS_DIR, 'index.md'), fullMd, 'utf-8');
    return res.json({ success: true, msg: 'index.md 已由后端自动生成写入磁盘' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 按当前配置返回首页源码（后台「复制源码」用，不写盘）
app.post('/api/home-source', (req, res) => {
  try {
    const hd = (req.body && req.body.config) ? req.body.config : {};
    return res.json({ success: true, markdown: buildHomeMarkdown(hd) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// 启动服务
app.listen(3001, () => {
  const bootMs = Date.now() - BOOT_T0;
  console.log('=================================');
  console.log('SUCCESS! Server is running on port 3001');
  console.log('URL: http://localhost:3001');
  console.log(`[boot] 端口就绪，用时 ${bootMs}ms`);
  console.log('=================================');

  // 💡 下面这些是「清理/加固」性质的工作，跟对外服务无关：
  //    放到 1.5 秒后再做，避免它们（尤其是 git 子进程）拖慢启动观感
  setTimeout(() => {

  // 💡 启动时自动清理：把 .git/config 里历史遗留的明文 Token 换成干净地址
  (async () => {
    try {
      if (!fs.existsSync(GIT_CONFIG_FILE)) return;
      const cfg = await fs.readJson(GIT_CONFIG_FILE);
      const clean = cleanGitUrl(cfg.repoUrl);
      if (!clean) return;
      const runCmd = (cmd) => new Promise((resolve) => {
        exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
          resolve({ success: !error, output: String(stdout || stderr || '') });
        });
      });
      const cur = await runCmd('git remote get-url origin');
      const curUrl = String(cur.output || '').trim();
      if (cur.success && curUrl && curUrl !== clean) {
        await runCmd(`git remote set-url origin "${clean}"`);
        console.log('[SECURITY] 已从 origin 远程地址中移除明文 Token');
        console.log('[SECURITY] origin =', clean);
      }
    } catch (e) { /* 静默：清理失败不影响启动 */ }
  })();

  // 💡 启动时清理历史遗留的 update*.zip（以前下载失败留下的 0 字节残骸，
  //    有些会被句柄锁住导致删不掉，能删就删，删不掉也不影响新的更新流程）
  (async () => {
    try {
      const files = await fs.readdir(__dirname);
      let removed = 0;
      for (const f of files) {
        if (/^update[\s\S]*\.zip$/i.test(f)) {
          try { await fs.remove(path.join(__dirname, f)); removed++; } catch (e) { /* 被锁住，跳过 */ }
        }
      }
      if (removed) console.log(`[CLEANUP] 已清理 ${removed} 个残留的 update*.zip`);
    } catch (e) { /* ignore */ }
  })();
  }, 1500);
});
// ================= 💡 兜底：缺少首页文件时自动生成 =================
// 全新安装的目录里没有 website/docs/index.md（首页属于各人自定义，不在更新清单里），
// 缺了它 VitePress 访问 / 会直接 404。启动时发现缺失就按空白模板补一份。
async function ensureHomeIndex() {
  const f = path.join(DOCS_DIR, 'index.md');
  try {
    if (fs.existsSync(f)) return;
    await fs.writeFile(f, buildHomeMarkdown({}), 'utf-8');
    console.log('[init] 缺少 website/docs/index.md，已生成空白首页');
  } catch (e) {
    console.log('[init] 生成默认首页失败：' + e.message);
  }
}
ensureHomeIndex();
// 💡 启动时清理历史 bug 留下的畸形页面：website/docs/**/xxx.html.md
//    （早期版本把 /plugin/xxx.html 当成前台路由，生成了 map.html.md 之类的文件）
async function cleanupBrokenPages() {
  const docsDir = path.join(__dirname, 'website', 'docs');
  const removed = [];
  const walk = async (dir) => {
    let entries = [];
    try { entries = await fs.readdir(dir); } catch (e) { return; }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const full = path.join(dir, name);
      let st; try { st = await fs.stat(full); } catch (e) { continue; }
      if (st.isDirectory()) {
        await walk(full);
        // 💡 只清理垃圾目录（plugin / __pycache__ 这类），绝不动用户自己建的空分类
        const junkName = ['plugin', '__pycache__', 'node_modules'].includes(name);
        if (junkName) {
          try {
            const left = await fs.readdir(full);
            if (!left.length) await fs.remove(full);
          } catch (e) { /* ignore */ }
        }
      } else if (/\.html?\.md$/i.test(name)) {
        try { await fs.remove(full); removed.push(path.relative(docsDir, full)); } catch (e) { /* ignore */ }
      }
    }
  };
  await walk(docsDir);
  if (removed.length) console.log('[init] 已清理畸形页面：' + removed.join(', '));
}
cleanupBrokenPages();
// 💡 前台侧边栏是 VitePress 启动时扫描 docs 生成的快照：
//    后台新建/删除分类后，不重启前台就看不到。
//    这里每 5 秒比对一次 docs 的结构签名，结构变了就"碰一下" config.mjs 的修改时间，
//    触发 VitePress 自己的「配置变更 → 重启」机制，侧边栏随之重建。
//    （不用 fs.watch：Windows 上句柄不持有会被 GC 回收，反而时灵时不灵）
function watchDocsStructure() {
  const docsDir = path.join(__dirname, 'website', 'docs');
  const configFile = path.join(__dirname, 'website', '.vitepress', 'config.mjs');
  const IGNORE_ROOT = ['public', 'assets', 'components', 'node_modules', '.vitepress'];

  const signature = () => {
    const out = [];
    const walk = (dir, prefix) => {
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of ents) {
        if (e.name.startsWith('.')) continue;
        if (!prefix && IGNORE_ROOT.includes(e.name)) continue;
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) {
          out.push('D:' + rel);
          walk(path.join(dir, e.name), rel);
        } else if (/\.md$/i.test(e.name)) {
          out.push('F:' + rel);
        }
      }
    };
    walk(docsDir, '');
    return out.sort().join('|');
  };

  let last = signature();
  setInterval(() => {
    let now = '';
    try { now = signature(); } catch (e) { return; }
    if (now === last) return;
    last = now;
    try {
      fs.utimes(configFile, new Date(), new Date(), () => {});
      console.log('[sidebar] docs 结构变化，已通知前台重建侧边栏');
    } catch (e) { /* ignore */ }
  }, 5000);
}
watchDocsStructure();