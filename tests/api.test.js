// 文件路径: tests/api.test.js
// 运行方式：node --test tests/
// 目标：把"改了代码有没有弄坏核心接口"变成一条命令能验证的事

const test = require('node:test');
const assert = require('node:assert');
const BASE = process.env.BASE || 'http://127.0.0.1:3001';

async function get(path) {
  const res = await fetch(BASE + path, { headers: { 'Cache-Control': 'no-cache' } });
  return { status: res.status, body: await res.text() };
}

async function postJson(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json, text };
}

test('服务在线：/api/ping', async () => {
  const r = await get('/api/ping');
  assert.equal(r.status, 200);
  const d = JSON.parse(r.body);
  assert.ok(d.pid > 0, '应返回进程号');
  assert.ok(typeof d.uptimeSec === 'number');
});

test('导航接口可用且都有 id', async () => {
  const r = await get('/api/navigation');
  assert.equal(r.status, 200);
  const list = JSON.parse(r.body);
  assert.ok(Array.isArray(list) && list.length > 0);
  assert.ok(list.every((n) => n && n.id), '每条导航都要有 id');
});

test('插件列表非空，且每个插件有名字和图标', async () => {
  const r = await get('/api/plugins/list');
  assert.equal(r.status, 200);
  const list = JSON.parse(r.body);
  assert.ok(list.length >= 15, '插件数量应 >= 15');
  list.forEach((p) => {
    assert.ok(p.id, '插件缺 id');
    assert.ok(p.name, p.id + ' 缺名字');
  });
});

test('全局搜索能搜到内容并带行号', async () => {
  const r = await get('/api/global-search?q=' + encodeURIComponent('的'));
  assert.equal(r.status, 200);
  const list = JSON.parse(r.body);
  assert.ok(Array.isArray(list));
  if (list.length) {
    assert.ok(list[0].rel, '搜索结果要有相对路径');
    assert.ok(typeof list[0].line === 'number', '搜索结果要有行号');
  }
});

test('空关键词返回空数组而不是报错', async () => {
  const r = await get('/api/global-search?q=');
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), []);
});

test('快照列表可读，字段完整', async () => {
  const r = await get('/api/backup/list');
  assert.equal(r.status, 200);
  const d = JSON.parse(r.body);
  assert.equal(d.success, true);
  assert.ok(Array.isArray(d.list));
  d.list.forEach((b) => {
    assert.ok(b.id);
    assert.ok(b.at);
  });
});

test('回收站列表可读', async () => {
  const r = await get('/api/trash/list');
  assert.equal(r.status, 200);
  const d = JSON.parse(r.body);
  assert.equal(d.success, true);
  assert.ok(Array.isArray(d.list));
});

test('备份保留份数可读可写', async () => {
  const before = JSON.parse((await get('/api/backup/config')).body);
  assert.ok(before.keep >= 3);
  const w = await postJson('/api/backup/config', { keep: 7 });
  assert.equal(w.json.success, true);
  const after = JSON.parse((await get('/api/backup/config')).body);
  assert.equal(after.keep, 7);
  await postJson('/api/backup/config', { keep: before.keep });   // 还原
});

test('写作目标可读可写', async () => {
  const before = JSON.parse((await get('/api/writing-goal')).body);
  const w = await postJson('/api/writing-goal', { target: 50000 });
  assert.equal(w.json.success, true);
  assert.equal(JSON.parse((await get('/api/writing-goal')).body).target, 50000);
  await postJson('/api/writing-goal', { target: before.target || 0 });
});

test('库文件读写闭环', async () => {
  const p = '_自动测试/读写给.md';
  const w = await postJson('/api/library/file', { path: p, content: '<div>自动化测试内容</div>' });
  assert.equal(w.json.success, true);

  const r = await get('/api/library/file?path=' + encodeURIComponent(p));
  assert.equal(r.status, 200);
  assert.ok(r.body.includes('自动化测试内容'));

  const h = await get('/api/history/list?path=' + encodeURIComponent(p));
  assert.equal(h.status, 200);

  // 清理：走回收站
  await postJson('/api/library/delete', { path: p });
});

test('路径穿越被拦截', async () => {
  const r = await get('/api/library/file?path=' + encodeURIComponent('../../server.js'));
  const body = r.body || '';
  assert.ok(!body.includes('CREATE TABLE'), '不能读到项目外的文件');
  assert.ok(r.status === 400 || body.length < 5000, '应被拒绝或返回空');
});

test('静态目录不暴露 server.js', async () => {
  const r = await get('/server.js');
  assert.notEqual(r.status, 200, 'server.js 不能通过静态目录直接下载');
});

test('前端错误上报接口不崩', async () => {
  const r = await postJson('/api/client-error', { msg: 'auto-test', url: 'test' });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test('科技树进度可读写', async () => {
  const before = JSON.parse((await get('/api/tech/progress')).body);
  assert.equal(before.success, true);

  const w = await postJson('/api/tech/progress', { progress: { fire: true } });
  assert.equal(w.json.success, true);

  const after = JSON.parse((await get('/api/tech/progress')).body);
  assert.equal(after.progress.fire, true);

  await postJson('/api/tech/progress', { progress: before.progress || {} });   // 还原
});

test('科技树自定义数据可读写', async () => {
  const before = JSON.parse((await get('/api/tech/data')).body);
  assert.equal(before.success, true);

  const w = await postJson('/api/tech/data', { custom: { standard: [{ id: 'test_era', name: '测试纪元', nodes: [] }] }, routeId: 'standard' });
  assert.equal(w.json.success, true);

  const after = JSON.parse((await get('/api/tech/data')).body);
  assert.ok(Array.isArray(after.custom.standard));

  await postJson('/api/tech/data', { custom: before.custom || {}, routeId: before.routeId || '' });   // 还原
});
