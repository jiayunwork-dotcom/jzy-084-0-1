/** 条件场景匹配：严格按声明顺序取第一个命中，都不命中走默认。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScenario } from '../src/mock/match.js';

const scenario = (name, conditions) => ({ name, conditions, fields: [] });

test('多个场景同时满足时，声明在前的生效', () => {
  const scenarios = [
    scenario('first', [{ source: 'query', key: 'type', op: 'eq', value: 'a' }]),
    scenario('second', [{ source: 'query', key: 'type', op: 'eq', value: 'a' }]),
  ];
  const hit = matchScenario(scenarios, { query: { type: 'a' }, headers: {} });
  assert.equal(hit.name, 'first');
});

test('前面的不命中则继续向后匹配', () => {
  const scenarios = [
    scenario('first', [{ source: 'query', key: 'type', op: 'eq', value: 'a' }]),
    scenario('second', [{ source: 'query', key: 'type', op: 'eq', value: 'b' }]),
  ];
  const hit = matchScenario(scenarios, { query: { type: 'b' }, headers: {} });
  assert.equal(hit.name, 'second');
});

test('都不命中时返回 null（走默认响应）', () => {
  const scenarios = [
    scenario('first', [{ source: 'query', key: 'type', op: 'eq', value: 'a' }]),
  ];
  assert.equal(matchScenario(scenarios, { query: { type: 'z' }, headers: {} }), null);
  assert.equal(matchScenario([], { query: {}, headers: {} }), null);
});

test('请求头条件：键大小写不敏感，支持 exists 操作符', () => {
  const scenarios = [
    scenario('auth', [{ source: 'header', key: 'X-Token', op: 'exists' }]),
  ];
  // Express 会把请求头统一转为小写
  assert.equal(matchScenario(scenarios, { query: {}, headers: { 'x-token': 'abc' } }).name, 'auth');
  assert.equal(matchScenario(scenarios, { query: {}, headers: {} }), null);
});

test('同一场景的多个条件是与关系', () => {
  const scenarios = [
    scenario('both', [
      { source: 'query', key: 'a', op: 'eq', value: '1' },
      { source: 'query', key: 'b', op: 'eq', value: '2' },
    ]),
  ];
  assert.equal(matchScenario(scenarios, { query: { a: '1' }, headers: {} }), null);
  assert.equal(
    matchScenario(scenarios, { query: { a: '1', b: '2' }, headers: {} }).name,
    'both',
  );
});

test('eq 条件按字符串比较（query 解析出的数字也能匹配）', () => {
  const scenarios = [scenario('p2', [{ source: 'query', key: 'page', op: 'eq', value: '2' }])];
  assert.equal(matchScenario(scenarios, { query: { page: 2 }, headers: {} }).name, 'p2');
});
