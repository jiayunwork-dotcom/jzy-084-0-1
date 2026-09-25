/** 循环引用检测：直接或间接成环都要识别，并指出构成环的模型。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findCycle, collectModelRefs } from '../src/domain/cycles.js';

const model = (id, fields) => ({ id, name: id.toUpperCase(), fields });
const ref = (modelId) => ({ name: `ref_${modelId}`, type: 'model', modelId });

test('两模型互相引用成环（甲 <-> 乙）', () => {
  const cycle = findCycle([model('a', [ref('b')]), model('b', [ref('a')])]);
  assert.ok(cycle, '应检测到环');
  assert.deepEqual(cycle, ['A', 'B', 'A']);
});

test('更长链路成环（甲 -> 乙 -> 丙 -> 甲）', () => {
  const cycle = findCycle([
    model('a', [ref('b')]),
    model('b', [ref('c')]),
    model('c', [ref('a')]),
  ]);
  assert.deepEqual(cycle, ['A', 'B', 'C', 'A']);
});

test('自引用成环', () => {
  const cycle = findCycle([model('a', [ref('a')])]);
  assert.deepEqual(cycle, ['A', 'A']);
});

test('嵌套在对象/数组里的引用也参与成环检测', () => {
  const models = [
    model('a', [
      {
        name: 'wrap',
        type: 'object',
        fields: [{ name: 'list', type: 'array', items: { type: 'model', modelId: 'b' } }],
      },
    ]),
    model('b', [ref('a')]),
  ];
  const cycle = findCycle(models);
  assert.deepEqual(cycle, ['A', 'B', 'A']);
});

test('无环的有向图正常通过', () => {
  const models = [
    model('a', [ref('b'), ref('c')]),
    model('b', [ref('d')]),
    model('c', [ref('d')]),
    model('d', [{ name: 'x', type: 'string' }]),
  ];
  assert.equal(findCycle(models), null);
});

test('悬空引用不算成环（由定义校验另行报告）', () => {
  assert.equal(findCycle([model('a', [ref('ghost')])]), null);
});

test('collectModelRefs 递归收集嵌套引用', () => {
  const refs = collectModelRefs([
    { name: 'one', type: 'model', modelId: 'm1' },
    {
      name: 'obj',
      type: 'object',
      fields: [
        { name: 'arr', type: 'array', items: { type: 'model', modelId: 'm2' } },
        { name: 'plain', type: 'string' },
      ],
    },
  ]);
  assert.deepEqual([...refs].sort(), ['m1', 'm2']);
});
