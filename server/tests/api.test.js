/** 集成测试：真实启动 Express 应用，走完整的 保存 -> Mock 请求 链路。 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { FileStore } from '../src/store/fileStore.js';

let server;
let base;
let dataFile;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-platform-'));
  dataFile = path.join(dir, 'store.json');
  const store = new FileStore(dataFile);
  store.load();
  // 清掉种子数据，保证测试环境干净
  store.data = { apis: [], models: [] };
  store.persist();
  store.reindex();
  const app = createApp(store);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

const postJson = (url, body) =>
  fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('保存非法路径返回结构化错误', async () => {
  const res = await postJson('/api/apis', {
    name: 'bad',
    path: 'no-slash',
    method: 'GET',
    fields: [],
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(body.error.details));
  assert.ok(body.error.details.some((d) => d.field === 'path'));
});

test('同一路径加方法的组合不允许重复', async () => {
  const payload = { name: 'a', path: '/dup', method: 'GET', fields: [] };
  assert.equal((await postJson('/api/apis', payload)).status, 201);
  const res = await postJson('/api/apis', { ...payload, name: 'b' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'DUPLICATE_ENDPOINT');
  // 路径末尾斜杠归一化后也算重复
  const res2 = await postJson('/api/apis', { ...payload, name: 'c', path: '/dup/' });
  assert.equal(res2.status, 409);
  // 不同方法不算重复
  assert.equal((await postJson('/api/apis', { ...payload, name: 'd', method: 'POST' })).status, 201);
});

test('循环引用在保存时被拒绝并指出环上的模型', async () => {
  const r1 = await postJson('/api/models', { name: 'Alpha', fields: [] });
  const alpha = await r1.json();
  const r2 = await postJson('/api/models', {
    name: 'Beta',
    fields: [{ name: 'alpha', type: 'model', modelId: alpha.id }],
  });
  const beta = await r2.json();
  // 让 Alpha 引用 Beta，构成 Alpha -> Beta -> Alpha
  const res = await fetch(`${base}/api/models/${alpha.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alpha',
      fields: [{ name: 'beta', type: 'model', modelId: beta.id }],
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'CIRCULAR_REFERENCE');
  assert.deepEqual(body.error.details.cycle, ['Alpha', 'Beta', 'Alpha']);
});

test('端到端：定义接口后请求 Mock 端点，场景按顺序命中', async () => {
  // 模型：User
  const userRes = await postJson('/api/models', {
    name: 'User',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string' },
    ],
  });
  assert.equal(userRes.status, 201);
  const user = await userRes.json();

  // 接口：GET /e2e/users，默认返回用户数组；query vip=true 时走场景
  const apiRes = await postJson('/api/apis', {
    name: '用户列表',
    path: '/e2e/users',
    method: 'GET',
    fields: [
      { name: 'code', type: 'number', min: 0, max: 0 },
      { name: 'users', type: 'array', items: { type: 'model', modelId: user.id } },
    ],
    scenarios: [
      {
        name: '贵宾',
        conditions: [{ source: 'query', key: 'vip', op: 'eq', value: 'true' }],
        fields: [{ name: 'vipUser', type: 'model', modelId: user.id }],
      },
    ],
  });
  assert.equal(apiRes.status, 201);

  // 默认响应
  const r1 = await fetch(`${base}/mock/e2e/users`);
  assert.equal(r1.status, 200);
  assert.equal(r1.headers.get('x-mock-scenario'), 'default');
  const d1 = await r1.json();
  assert.equal(d1.code, 0);
  assert.ok(Array.isArray(d1.users) && d1.users.length >= 1 && d1.users.length <= 5);
  assert.match(d1.users[0].email, /@/);

  // 命中场景
  const r2 = await fetch(`${base}/mock/e2e/users?vip=true`);
  assert.equal(r2.headers.get('x-mock-scenario'), encodeURIComponent('贵宾'));
  const d2 = await r2.json();
  assert.ok(d2.vipUser && typeof d2.vipUser.name === 'string');
  assert.equal(d2.users, undefined);

  // 未定义的端点 404
  const r3 = await fetch(`${base}/mock/no/such`);
  assert.equal(r3.status, 404);
  assert.equal((await r3.json()).error.code, 'MOCK_NOT_FOUND');
});

test('定义真正落盘持久化', async () => {
  const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.ok(raw.apis.length >= 3);
  assert.ok(raw.models.length >= 1);
});
