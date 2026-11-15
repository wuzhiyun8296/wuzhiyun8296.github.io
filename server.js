const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const marked = require('marked'); // 💡 移到顶层引入

const app = express();
app.use(cors());
app.use(express.static(__dirname)); 
app.use(express.json());

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
        tree.push({ name: file, type: 'folder', children: await getTree(fullPath, false) });
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
    const targetPath = req.body.path;
    const fullPath = path.join(DOCS_DIR, targetPath);
    
    if (!fullPath.startsWith(DOCS_DIR)) return res.status(403).json({ error: '非法路径' });

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
    await fs.writeJson(filePath, {
      items: [
        { name: '黑面包', price: 1 },
        { name: '淡啤酒', price: 3 },
        { name: '治疗药水(小)', price: 50 }
      ],
      stocks: [
        { symbol: 'TMC', name: '秋月商会 (The Moonvale Co.)', basePrice: 100, currentPrice: 100, history: [] }
      ],
      currencies: [
        { symbol: 'Gold', name: '黄金 (基准)', basePrice: 1, currentPrice: 1 },
        { symbol: 'GC', name: '帝国金币', basePrice: 0.1, currentPrice: 0.1 },
        { symbol: 'SC', name: '联邦银币', basePrice: 0.01, currentPrice: 0.01 }
      ]
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
    const scanDir = (dir, baseDir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;
        
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath, baseDir);
        } else if (file.endsWith('.md') && file !== 'index.md') {
          allMdFiles.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
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
            existing = { type: 'folder', name: part, icon: '📁', children: [] };
            currentLevel.push(existing);
          }
        }
        if (!isFile) {
          if(!existing.children) existing.children = [];
          currentLevel = existing.children;
        }
      });
    });

    await fs.writeJson(treePath, treeData, { spaces: 2 });
    res.json({ success: true, addedCount, treeData });
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

// ================= 高级剧情线管理接口 =================
app.get('/api/plotline', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'plotline.json');
  if (!fs.existsSync(filePath)) {
    const defaultData = [
      {
        id: "v_1",
        title: "第一卷：初入幻想域",
        chapters: [
          { id: "c_1", title: "第一章：觉醒", desc: "主角发现自己拥有异能..." },
          { id: "c_2", title: "第二章：相遇", desc: "在集市遇到了神秘商人..." }
        ]
      }
    ];
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
  <title>${bookName} - 幻想域小说集</title>
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
    <div class="book-subtitle">幻想域小说集 · 一键成书</div>
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
    let articleCount = 0;
    
    const countWords = (dir, isRoot = false) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (IGNORE_DIRS.includes(file) || file.startsWith('.')) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          countWords(fullPath, false); 
        } else if (file.endsWith('.md')) {
          if (isRoot && dir === DOCS_DIR) continue;

          const rawContent = fs.readFileSync(fullPath, 'utf-8');
          
          if (rawContent.includes('<script') || rawContent.includes('<template') || rawContent.includes('import ')) {
            continue;
          }

          let cleanText = rawContent
            .replace(/<[^>]+>/g, '')                  
            .replace(/!\[.*?\]\(.*?\)/g, '')          
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')       
            .replace(/[#*_`~=\-|>\s\n\r]/g, '');     
            
          totalWords += cleanText.length;
          articleCount++;
        }
      }
    };
    
    countWords(DOCS_DIR, true); 
    countWords(LIBRARY_DIR, false); 

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

    res.json({ totalWords, articleCount, charCount, treeCount, markerCount });
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
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: '请填写提交信息' });
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

    // 💡 移除外部多余的 copyNovelFiles 调用，统一在 if 块内完成

    const gitignorePath = path.join(__dirname, '.gitignore');
    const ignoreContent = 'node_modules/\ngit-config.json\n.git/\nwebsite/node_modules/\nwebsite/.vitepress/cache/\nwebsite/.vitepress/dist/\n';
    await fs.writeFile(gitignorePath, ignoreContent, 'utf-8');

    await runCmd('git init');
    const cleanName = (config.userName || 'Admin').trim();
    const cleanEmail = (config.userEmail || 'admin@local').trim();
    await runCmd(`git config user.name "${cleanName}"`);
    await runCmd(`git config user.email "${cleanEmail}"`);

    let rawUrl = config.repoUrl.trim();
    if (rawUrl.startsWith('https://')) rawUrl = rawUrl.substring(8);
    const safeToken = config.token.trim();
    const authUrl = `https://${safeToken}@${rawUrl}`; 

    await runCmd(`git remote remove origin`);
    await runCmd(`git remote add origin ${authUrl}`);
    logs.push(`> 配置远程仓库: 成功\n`);

    await runCmd('git branch -M main');
    await runCmd('git rm --cached git-config.json -f');
    await runCmd('git add .');
    
    let res2 = await runCmd(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    logs.push(`> git commit: ${res2.success ? '成功' : '跳过(无修改)'}\n`);

    logs.push(`> 正在推送到 GitHub...\n`);
    let res3 = await runCmd('git push -u origin main -f');
    
    let safeOutput = res3.output.replace(new RegExp(safeToken, 'g'), '***');
    logs.push(safeOutput + '\n');

    if (!res3.success) return res.json({ success: false, log: logs.join('\n') });
    logs.push(`\n[SUCCESS] 代码及小说书架已成功推送！\n`);
    res.json({ success: true, log: logs.join('\n') });
  } catch (error) {
    logs.push(`[ERROR] 执行异常: ${error.message}\n`);
    res.json({ success: false, log: logs.join('\n') });
  }
});
// ================= 💡 检测并拉取 GitHub 更新 =================
app.get('/api/git/check-update', async (req, res) => {
  if (!fs.existsSync(GIT_CONFIG_FILE)) return res.status(400).json({ success: false, error: '请先在【一键推送】中配置 GitHub Token' });

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { cwd: __dirname, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  try {
    const config = await fs.readJson(GIT_CONFIG_FILE);
    let rawUrl = config.repoUrl.trim();
    if (rawUrl.startsWith('https://')) rawUrl = rawUrl.substring(8);
    const safeToken = config.token.trim();
    const authUrl = `https://${safeToken}@${rawUrl}`;
    
    // 确保连接到正确的仓库
    await runCmd('git remote remove origin');
    await runCmd(`git remote add origin ${authUrl}`);

    // 拉取远程分支信息（只拉取不合并）
    const fetchRes = await runCmd('git fetch origin main');
    if (!fetchRes.success) return res.json({ success: false, error: '拉取远程信息失败，请检查网络或 Token：' + fetchRes.output.replace(new RegExp(safeToken, 'g'), '***') });

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
  if (!fs.existsSync(GIT_CONFIG_FILE)) return res.status(400).json({ success: false, error: '请先配置 GitHub Token' });

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { cwd: __dirname, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  let logs = [];
  try {
    const config = await fs.readJson(GIT_CONFIG_FILE);
    let rawUrl = config.repoUrl.trim();
    if (rawUrl.startsWith('https://')) rawUrl = rawUrl.substring(8);
    const safeToken = config.token.trim();
    const authUrl = `https://${safeToken}@${rawUrl}`;
    
    await runCmd('git remote remove origin');
    await runCmd(`git remote add origin ${authUrl}`);
    
    logs.push('> 正在暂存本地修改（防止冲突）...');
    await runCmd('git add .');
    await runCmd('git stash');
    
    logs.push('> 正在拉取远程最新代码...');
    const pullRes = await runCmd('git pull origin main');
    
    logs.push('> 正在恢复你的本地文件...');
    const popRes = await runCmd('git stash pop');
    
    if (pullRes.success) {
      res.json({ success: true, log: logs.join('\n') + '\n' + pullRes.output.replace(new RegExp(safeToken, 'g'), '***') + '\n' + popRes.output });
    } else {
      res.json({ success: false, error: pullRes.output.replace(new RegExp(safeToken, 'g'), '***') });
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
    await fs.writeJson(PROTECTION_CONFIG_FILE, {
      enableNovelSync: true, 
      enableWatermark: true, 
      authorName: '幻想域作者', 
      enableAntiCopy: true, 
      copyrightText: '本文摘自《幻想域》，请支持正版。',
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

// ================= 💡 一键导出纯净系统包 =================
app.get('/api/export/init', async (req, res) => {
  try {
    // 我们不在原目录直接打包（防止把 node_modules 或用户数据打进去）
    // 而是先复制到一个临时文件夹进行清洗
    const tempDir = path.join(__dirname, '.temp_export_build');
    await fs.remove(tempDir); // 清理旧临时目录
    await fs.ensureDir(tempDir);

    // 需要复制并打包的核心文件夹和文件
    const keepList = [
      'server.js', 'admin.html', 'package.json', 
      'plugin', 'website', 'node_modules' // 如果不带 node_modules 包会很小，但别人需要 npm install
    ];

    for (const item of keepList) {
      const srcPath = path.join(__dirname, item);
      const destPath = path.join(tempDir, item);
      if (fs.existsSync(srcPath)) {
        if (item === 'website') {
          // 💡 清理 website 里的用户数据
          await fs.copy(srcPath, destPath, {
            filter: (src) => {
              // 排除用户产生的大文件/数据
              if (src.includes('node_modules') || src.includes('.vitepress/dist') || src.includes('.vitepress/cache')) return false;
              if (src.includes('docs/public/assets')) return false;
              if (src.includes('docs/novel/chapters')) return false;
              return true;
            }
          });
        } else {
          await fs.copy(srcPath, destPath);
        }
      }
    }

    // 💡 构建干净的空数据文件
    const publicDir = path.join(tempDir, 'website/docs/public');
    await fs.ensureDir(publicDir);
    
    await fs.writeJson(path.join(publicDir, 'characters.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'timeline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'graph.json'), { nodes: [], links: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'map.json'), { image: '', markers: [] }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'world-tree.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'plotline.json'), [], { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'finance.json'), {
      items: [],
      stocks: [],
      currencies: [{ symbol: 'Gold', name: '黄金', basePrice: 1, currentPrice: 1 }]
    }, { spaces: 2 });
    await fs.writeJson(path.join(publicDir, 'protection-config.json'), {
      enableNovelSync: true, enableWatermark: true, authorName: '新作者', enableAntiCopy: true, copyrightText: '请支持正版。', targetWords: 100000, lastCertifiedMilestone: 0
    }, { spaces: 2 });

    // 清理 novel/chapters 目录
    const chaptersDir = path.join(tempDir, 'website/docs/novel/chapters');
    await fs.ensureDir(chaptersDir);

    // 清理 library 目录
    const libDir = path.join(tempDir, 'library');
    await fs.ensureDir(libDir);
    await fs.writeFile(path.join(libDir, '.gitkeep'), '');

    // 💡 执行压缩命令 (利用 Windows 自带的 tar 命令)
    const zipName = `my-world-system-init.zip`;
    const zipPath = path.join(__dirname, zipName);
    
    // tar -a -c -f 压缩包路径 -C 目录 .
    // Windows 的 tar 完美支持这种打包方式
    await new Promise((resolve, reject) => {
      exec(`tar -a -c -f "${zipPath}" -C "${tempDir}" .`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // 删除临时目录
    await fs.remove(tempDir);

    // 发送给客户端下载
    res.download(zipPath, zipName, async () => {
      // 下载完毕后清理生成的 zip
      await fs.remove(zipPath);
    });

  } catch (error) {
    res.status(500).send('导出失败: ' + error.message);
  }
});

// ================= 💡 一键导出全站干净模板 (ZIP) =================
app.get('/api/export/template', async (req, res) => {
  try {
    const tempDir = path.join(__dirname, '.temp_export_build');
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    const keepList = ['server.js', 'admin.html', 'package.json', 'plugin', 'website'];
    
    // 1. 复制核心文件，剔除无用大文件
    for (const item of keepList) {
      const srcPath = path.join(__dirname, item);
      const destPath = path.join(tempDir, item);
      if (fs.existsSync(srcPath)) {
        if (item === 'website') {
          await fs.copy(srcPath, destPath, {
            filter: (src) => {
              // 排除缓存、大文件、用户数据
              if (src.includes('node_modules') || src.includes('.vitepress/dist') || src.includes('.vitepress/cache')) return false;
              if (src.includes('docs/public/assets')) return false;
              if (src.includes('docs/novel/chapters')) return false;
              return true;
            }
          });
        } else {
          await fs.copy(srcPath, destPath);
        }
      }
    }

    // 2. 重置所有的 JSON 数据为空
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

    // 3. 清空小说库和前台的章节
    await fs.emptyDir(path.join(tempDir, 'library'));
    await fs.ensureDir(path.join(tempDir, 'website/docs/novel/chapters'));

    // 4. 使用 Windows 自带 tar 命令打包 (零依赖)
    const zipName = `my-world-system-template.zip`;
    const zipPath = path.join(__dirname, zipName);
    
    await new Promise((resolve, reject) => {
      exec(`tar -a -c -f "${zipPath}" -C "${tempDir}" .`, (error) => {
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
app.get('/api/navigation', async (req, res) => {
  if (!fs.existsSync(NAVIGATION_FILE)) {
    // 💡 首次初始化：把所有内置核心功能全部写入，确保顺序完整
    const defaultNav = [
      { id: 'writer', title: '沉浸码字', desc: '系统内置', icon: '✍️', link: '/writer', isSystem: true },
      { id: 'plotline', title: '剧情大纲', desc: '系统内置', icon: '🎬', link: '/plotline', isSystem: true },
      { id: 'timeline', title: '时间线', desc: '系统内置', icon: '⏳', link: '/timeline', isSystem: true },
      { id: 'characters', title: '人物档案', desc: '系统内置', icon: '👤', link: '/characters', isSystem: true },
      { id: 'graph', title: '关系图谱', desc: '系统内置', icon: '🕸️', link: '/graph', isSystem: true },
      { id: 'finance', title: '金融中心', desc: '系统内置', icon: '💰', link: '/finance', isSystem: true },
      { id: 'world-tree', title: '世界观树', desc: '系统内置', icon: '🌍', link: '/world-tree', isSystem: true },
      { id: 'map', title: '世界地图', desc: '系统内置', icon: '🗺️', link: '/map', isSystem: true },
      { id: 'epoch-map', title: '纪元地图', desc: '系统内置', icon: '🕰️', link: '/epoch-map', isSystem: true },
      { id: 'audit', title: '防吃书校验', desc: '系统内置', icon: '🕵️', link: '/audit', isSystem: true },
      { id: 'protection', title: '版权与目标', desc: '系统内置', icon: '🎯', link: '/protection', isSystem: true },
      { id: 'github', title: '一键推送', desc: '系统内置', icon: '🚀', link: '/github', isSystem: true },
      { id: 'home-editor', title: '首页设计与导出', desc: '系统内置', icon: '🎨', link: '/home-editor', isSystem: true },
      { id: 'novel', title: '幻想域小说', desc: '阅读主角的奇妙冒险。', icon: '📖', link: '/novel/', isSystem: true }
    ];
    await fs.writeJson(NAVIGATION_FILE, defaultNav, { spaces: 2 });
  }
  
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
  if (needSave) await fs.writeJson(NAVIGATION_FILE, navList, { spaces: 2 });
  
  res.json(navList);
});

// 2. 保存导航数据
app.post('/api/navigation', async (req, res) => {
  await fs.writeJson(NAVIGATION_FILE, req.body, { spaces: 2 });
  res.json({ success: true });
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
// 启动服务
app.listen(3001, () => {
  console.log('=================================');
  console.log('SUCCESS! Server is running on port 3001');
  console.log('URL: http://localhost:3001');
  console.log('=================================');
});