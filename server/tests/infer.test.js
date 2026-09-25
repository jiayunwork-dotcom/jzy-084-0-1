/** 字段名语义推测：生成的数据类别必须与字段名语义一致。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferCategory, generateString, generateNumber } from '../src/mock/infer.js';

test('邮箱字段生成合法邮箱', () => {
  for (const name of ['email', 'userEmail', 'user_email', 'mail']) {
    assert.equal(inferCategory(name), 'email', name);
    for (let i = 0; i < 20; i += 1) {
      const v = generateString(name);
      assert.match(v, /^[a-z0-9]+@[a-z0-9.-]+\.[a-z]{2,}$/, `${name} -> ${v}`);
    }
  }
});

test('电话字段生成合法手机号', () => {
  for (const name of ['phone', 'mobile', 'phoneNumber', 'tel']) {
    assert.equal(inferCategory(name), 'phone', name);
    for (let i = 0; i < 20; i += 1) {
      assert.match(generateString(name), /^1[3-9]\d{9}$/);
    }
  }
});

test('名称字段生成中文人名', () => {
  for (const name of ['name', 'username', 'user_name', 'nickname', 'author', 'creator']) {
    assert.equal(inferCategory(name), 'name', name);
    for (let i = 0; i < 20; i += 1) {
      assert.match(generateString(name), /^[一-龥]{2,4}$/);
    }
  }
});

test('地址字段生成地址', () => {
  for (const name of ['address', 'addr', 'location']) {
    assert.equal(inferCategory(name), 'address', name);
    assert.match(generateString(name), /市.+区.+(路|大道|街)\d+号/);
  }
});

test('网址字段生成链接', () => {
  for (const name of ['url', 'website', 'homepage', 'link']) {
    assert.equal(inferCategory(name), 'url', name);
    assert.match(generateString(name), /^https:\/\/[\w.-]+\/\w+$/);
  }
});

test('头像字段生成图片链接，且优先于普通 url 规则', () => {
  for (const name of ['avatar', 'avatarUrl', 'avatar_url']) {
    assert.equal(inferCategory(name), 'avatar', name);
    assert.match(generateString(name), /^https:\/\//);
  }
  assert.equal(inferCategory('coverImage'), 'image');
  assert.match(generateString('coverImage'), /^https:\/\//);
});

test('识别不出语义时回退到通用随机字符串', () => {
  assert.equal(inferCategory('xyzzy_qqq'), 'string');
  const v = generateString('xyzzy_qqq');
  assert.equal(typeof v, 'string');
  assert.match(v, /^[a-z0-9]+$/);
});

test('数字字段在合理范围内取值', () => {
  for (let i = 0; i < 50; i += 1) {
    const age = generateNumber({ name: 'age', type: 'number' });
    assert.ok(age >= 18 && age <= 65, `age=${age}`);
    const ranged = generateNumber({ name: 'score', type: 'number', min: 60, max: 100 });
    assert.ok(ranged >= 60 && ranged <= 100, `score=${ranged}`);
    const dflt = generateNumber({ name: 'whatever', type: 'number' });
    assert.ok(dflt >= 0 && dflt <= 100, `default=${dflt}`);
  }
  assert.equal(generateNumber({ name: 'code', type: 'number', min: 0, max: 0 }), 0);
});
