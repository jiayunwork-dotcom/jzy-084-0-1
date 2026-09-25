/** 假数据递归生成：模型多层嵌套展开、数组、枚举、深度兜底。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateObject, generateField } from '../src/mock/generate.js';

function modelsToCtx(models) {
  return { modelsById: new Map(models.map((m) => [m.id, m])) };
}

test('模型引用能多层递归展开（A -> B -> C）', () => {
  const models = [
    {
      id: 'c',
      name: 'C',
      fields: [{ name: 'leafEmail', type: 'string' }],
    },
    {
      id: 'b',
      name: 'B',
      fields: [
        { name: 'bName', type: 'string' },
        { name: 'c', type: 'model', modelId: 'c' },
      ],
    },
    {
      id: 'a',
      name: 'A',
      fields: [
        { name: 'aFlag', type: 'boolean' },
        { name: 'b', type: 'model', modelId: 'b' },
      ],
    },
  ];
  const ctx = modelsToCtx(models);
  const out = generateObject([{ name: 'root', type: 'model', modelId: 'a' }], ctx);
  assert.equal(typeof out.root.aFlag, 'boolean');
  assert.equal(typeof out.root.b.bName, 'string');
  assert.match(out.root.b.c.leafEmail, /@/); // 三层嵌套最深处仍按字段名推测
});

test('数组字段生成 1-5 个元素，元素按声明类型递归生成', () => {
  const ctx = modelsToCtx([
    { id: 'u', name: 'U', fields: [{ name: 'email', type: 'string' }] },
  ]);
  for (let i = 0; i < 30; i += 1) {
    const out = generateObject(
      [
        { name: 'tags', type: 'array', items: { type: 'string' } },
        { name: 'users', type: 'array', items: { type: 'model', modelId: 'u' } },
        {
          name: 'matrix',
          type: 'array',
          items: { type: 'object', fields: [{ name: 'n', type: 'number' }] },
        },
      ],
      ctx,
    );
    for (const key of ['tags', 'users', 'matrix']) {
      assert.ok(Array.isArray(out[key]), key);
      assert.ok(out[key].length >= 1 && out[key].length <= 5, `${key}.length=${out[key].length}`);
    }
    assert.ok(out.tags.every((t) => typeof t === 'string'));
    assert.ok(out.users.every((u) => typeof u.email === 'string' && u.email.includes('@')));
    assert.ok(out.matrix.every((m) => typeof m.n === 'number'));
  }
});

test('数组长度可用 minItems/maxItems 固定（含空数组）', () => {
  const out = generateObject(
    [{ name: 'empty', type: 'array', minItems: 0, maxItems: 0, items: { type: 'string' } }],
    modelsToCtx([]),
  );
  assert.deepEqual(out.empty, []);
});

test('枚举字段从候选值中随机选取', () => {
  const values = ['admin', 'member', 'guest'];
  for (let i = 0; i < 50; i += 1) {
    const v = generateField({ name: 'role', type: 'enum', values }, modelsToCtx([]), 0);
    assert.ok(values.includes(v), v);
  }
});

test('嵌套对象字段递归展开', () => {
  const out = generateObject(
    [
      {
        name: 'meta',
        type: 'object',
        fields: [
          { name: 'page', type: 'number', min: 1, max: 1 },
          {
            name: 'author',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
        ],
      },
    ],
    modelsToCtx([]),
  );
  assert.equal(out.meta.page, 1);
  assert.match(out.meta.author.name, /^[一-龥]{2,4}$/);
});

test('防御性深度上限：即使定义成环也不会无限递归', () => {
  // 绕过保存期校验直接构造互相引用的模型，生成器必须安全返回而不是栈溢出
  const models = [
    { id: 'x', name: 'X', fields: [{ name: 'y', type: 'model', modelId: 'y' }] },
    { id: 'y', name: 'Y', fields: [{ name: 'x', type: 'model', modelId: 'x' }] },
  ];
  const out = generateObject([{ name: 'root', type: 'model', modelId: 'x' }], modelsToCtx(models));
  assert.ok(typeof out === 'object');
});
