const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');

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

fs.ensureDirSync(PUBLIC_DIR);
fs.ensureDirSync(ASSETS_DIR);
fs.ensureDirSync(FONTS_DIR);
fs.ensureDirSync(LIBRARY_DIR);

app.use('/public', express.static(PUBLIC_DIR));
app.use('/assets', express.static(path.join(DOCS_DIR, 'assets')));

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
      if (file === 'assets' || file === 'public' || file.startsWith('.')) continue;
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
        if (file.startsWith('.') || file === 'assets' || file === 'public') continue;
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

// ================= 仪表盘与全局搜索接口 =================
const INBOX_FILE = path.join(LIBRARY_DIR, 'inbox.json');

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    let totalWords = 0;
    let articleCount = 0;
    
    const countWords = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'assets' && file !== 'public' && !file.startsWith('.')) {
          countWords(fullPath);
        } else if (file.endsWith('.md')) {
          const rawContent = fs.readFileSync(fullPath, 'utf-8');
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
    countWords(DOCS_DIR);
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
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && file !== 'assets' && file !== 'public' && !file.startsWith('.')) {
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
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'assets' && file !== 'public' && !file.startsWith('.')) {
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
  if (fs.existsSync(GIT_CONFIG_FILE)) {
    res.json(await fs.readJson(GIT_CONFIG_FILE));
  } else {
    res.json({ repoUrl: '', userName: '', userEmail: '', token: '' });
  }
});

app.post('/api/git/config', async (req, res) => {
  try {
    await fs.writeJson(GIT_CONFIG_FILE, req.body, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/git/push', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: '请填写提交信息' });
  if (!fs.existsSync(GIT_CONFIG_FILE)) return res.status(400).json({ error: '请先保存 GitHub 配置' });

  const config = await fs.readJson(GIT_CONFIG_FILE);
  if (!config.repoUrl || !config.token) return res.status(400).json({ error: '配置不完整，请检查仓库地址和 Token' });

  const runCmd = (cmd) => new Promise((resolve) => {
    exec(cmd, { 
      cwd: __dirname,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    }, (error, stdout, stderr) => {
      if (error) resolve({ success: false, output: stderr || stdout || error.message });
      else resolve({ success: true, output: stdout || stderr });
    });
  });

  let logs = [];
  logs.push(`[INFO] 开始配置并执行 Git 推送...\n`);

  try {
    // 1. 自动生成 .gitignore，防止密码泄露
    const gitignorePath = path.join(__dirname, '.gitignore');
    const ignoreContent = 'node_modules/\ngit-config.json\n.git/\nwebsite/node_modules/\nwebsite/.vitepress/cache/\nwebsite/.vitepress/dist/\n';
    await fs.writeFile(gitignorePath, ignoreContent, 'utf-8');

    // 2. 初始化（如果没初始化）并配置用户信息
    await runCmd('git init');
    
    const cleanName = (config.userName || 'Admin').trim();
    const cleanEmail = (config.userEmail || 'admin@local').trim();
    await runCmd(`git config user.name "${cleanName}"`);
    await runCmd(`git config user.email "${cleanEmail}"`);

    // 3. 标准的 Token 认证 URL
    let rawUrl = config.repoUrl.trim();
    if (rawUrl.startsWith('https://')) rawUrl = rawUrl.substring(8);
    const safeToken = config.token.trim();
    const authUrl = `https://${safeToken}@${rawUrl}`; // 💡 只用 Token 认证

    await runCmd(`git remote remove origin`);
    await runCmd(`git remote add origin ${authUrl}`);
    logs.push(`> 配置远程仓库: 成功\n`);

    await runCmd('git branch -M main');

    // 4. 精准剔除密码文件
    await runCmd('git rm --cached git-config.json -f');
    
    await runCmd('git add .');
    
    let res2 = await runCmd(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    logs.push(`> git commit: ${res2.success ? '成功' : '跳过(无修改)'}\n`);

    logs.push(`> 正在推送到 GitHub...\n`);
    // 5. 强制覆盖远端历史，洗白之前的密码
    let res3 = await runCmd('git push -u origin main -f');
    
    let safeOutput = res3.output.replace(new RegExp(safeToken, 'g'), '***');
    logs.push(safeOutput + '\n');

    if (!res3.success) {
      return res.json({ success: false, log: logs.join('\n') });
    }

    logs.push(`\n[SUCCESS] 代码已成功推送到 GitHub！\n`);
    res.json({ success: true, log: logs.join('\n') });

  } catch (error) {
    logs.push(`[ERROR] 执行异常: ${error.message}\n`);
    res.json({ success: false, log: logs.join('\n') });
  }
});

// 启动服务 (纯英文输出，绝对防卡死)
app.listen(3001, () => {
  console.log('=================================');
  console.log('SUCCESS! Server is running on port 3001');
  console.log('URL: http://localhost:3001');
  console.log('=================================');
});