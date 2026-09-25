/** 定义校验：路径合法性、枚举候选值、模型引用存在性等。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePath, validateApiPayload, validateModelPayload, normalizePath } from '../src/domain/validate.js';

test('路径必须以斜杠开头', () => {
  assert.equal(validatePath('/users').length, 0);
  const errors = validatePath('users');
  assert.ok(errors.some((e) => e.message.includes('以斜杠')));
});

test('路径不允许连续双斜杠', () => {
  const errors = validatePath('/a//b');
  assert.ok(errors.some((e) => e.message.includes('双斜杠')));
  assert.equal(validatePath('/a/b/c').length, 0);
});

test('路径不允许空白字符与空路径', () => {
  assert.ok(validatePath('/a b').length > 0);
  assert.ok(validatePath('').length > 0);
});

test('normalizePath 去掉末尾斜杠', () => {
  assert.equal(normalizePath('/users/'), '/users');
  assert.equal(normalizePath('/'), '/');
});

test('枚举没有候选值时保存报错', () => {
  const errors = validateApiPayload(
    {
      name: 'x',
      path: '/x',
      method: 'GET',
      fields: [{ name: 'status', type: 'enum', values: [] }],
    },
    new Map(),
  );
  assert.ok(errors.some((e) => e.field.includes('values') && e.message.includes('候选值')));
});

test('引用不存在的模型时保存报错', () => {
  const errors = validateApiPayload(
    {
      name: 'x',
      path: '/x',
      method: 'GET',
      fields: [{ name: 'u', type: 'model', modelId: 'not-exist' }],
    },
    new Map(),
  );
  assert.ok(errors.some((e) => e.message.includes('模型不存在')));
});

test('场景条件校验：来源与操作符必须合法', () => {
  const errors = validateApiPayload(
    {
      name: 'x',
      path: '/x',
      method: 'GET',
      fields: [],
      scenarios: [
        {
          name: 's1',
          conditions: [{ source: 'cookie', key: 'k', op: 'eq', value: 'v' }],
          fields: [],
        },
      ],
    },
    new Map(),
  );
  assert.ok(errors.some((e) => e.message.includes('query 或 header')));
});

test('模型名称非法时保存报错', () => {
  const errors = validateModelPayload({ name: '1bad name', fields: [] }, new Map());
  assert.ok(errors.some((e) => e.field === 'name'));
});

test('同层字段名重复时保存报错', () => {
  const errors = validateModelPayload(
    {
      name: 'M',
      fields: [
        { name: 'a', type: 'string' },
        { name: 'a', type: 'number' },
      ],
    },
    new Map(),
  );
  assert.ok(errors.some((e) => e.message.includes('重复')));
});
