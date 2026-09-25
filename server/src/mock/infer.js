/**
 * 字段名语义推测：根据字段名判断字符串字段应该生成哪一类可信数据。
 * 匹配顺序即优先级（如 avatarUrl 要先命中 avatar 而不是 url）。
 */

const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];

const SURNAMES = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '罗', '郑', '冯'];
const GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀英', '子涵', '雨桐', '浩然', '欣怡', '一诺', '梓萱', '沐宸', '若汐'];
const PINYIN = ['zhang', 'wang', 'li', 'zhao', 'liu', 'chen', 'yang', 'huang', 'zhou', 'wu', 'xu', 'sun', 'ma', 'zhu', 'hu', 'guo', 'lin', 'he', 'luo', 'zheng'];
const EMAIL_DOMAINS = ['example.com', 'sample.org', 'mail.test', 'demo.io', 'mock.dev'];
const CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];
const DISTRICTS = ['朝阳区', '海淀区', '浦东新区', '天河区', '南山区', '西湖区', '武侯区', '江汉区', '玄武区', '雁塔区'];
const ROADS = ['人民路', '中山路', '解放大道', '建设路', '和平街', '文化路', '学院路', '滨江大道', '朝阳北路', '复兴路'];
const WORDS = ['阳光', '清晨', '远方', '山海', '星辰', '微风', '落叶', '晨光', '暮色', '流云', '青空', '烟火', '原野', '潮汐', '林间', '暖阳'];
const URL_SLUGS = ['home', 'about', 'products', 'news', 'docs', 'blog', 'dashboard', 'settings', 'profile', 'guide'];

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomChars(pool, len) {
  let s = '';
  for (let i = 0; i < len; i += 1) s += pool[randInt(pool.length)];
  return s;
}

/** 各类别的假数据生成器。 */
export const generators = {
  name: () => pick(SURNAMES) + pick(GIVEN_NAMES),
  email: () => `${pick(PINYIN)}${pick(PINYIN)}${randInt(100)}@${pick(EMAIL_DOMAINS)}`,
  phone: () => `1${pick(['3', '5', '7', '8', '9'])}${randomChars('0123456789', 9)}`,
  address: () => `${pick(CITIES)}${pick(DISTRICTS)}${pick(ROADS)}${1 + randInt(200)}号`,
  url: () => `https://www.${pick(['example', 'sample', 'demo', 'mock'])}.${pick(['com', 'org', 'net', 'io'])}/${pick(URL_SLUGS)}`,
  avatar: () => `https://i.pravatar.cc/150?img=${1 + randInt(70)}`,
  image: () => `https://picsum.photos/seed/${randomChars(ALNUM, 8)}/640/360`,
  date: () => new Date(Date.now() - randInt(365 * 24 * 3600 * 1000)).toISOString(),
  title: () => `${pick(WORDS)}${Math.random() < 0.5 ? '与' : '的'}${pick(WORDS)}`,
  description: () => `${pick(WORDS)}般的${pick(WORDS)}，藏着${pick(WORDS)}与${pick(WORDS)}的故事。`,
  uuid: () => crypto.randomUUID(),
  message: () => pick(['success', 'ok', '操作成功', '请求成功']),
  string: () => randomChars(ALNUM, 10),
};

/**
 * 根据字段名推测数据类别。
 * @param {string} name 字段名
 * @returns {keyof typeof generators}
 */
export function inferCategory(name = '') {
  const n = String(name);
  if (/avatar|portrait|head_?pic/i.test(n)) return 'avatar';
  if (/(image|img|photo|picture|pic|logo|banner|cover)(_?url)?$/i.test(n)) return 'image';
  if (/e?_?mail/i.test(n)) return 'email';
  if (/(phone|mobile|tel)(_?number)?$/i.test(n)) return 'phone';
  if (/(web_?site|home_?page|url|link|href|site)$/i.test(n)) return 'url';
  if (/(address|addr|street|location)/i.test(n)) return 'address';
  if (/(first|last|family|given)_?name$/i.test(n)) return 'name';
  if (/^(user_?name|nick_?name|real_?name|full_?name|name)$/i.test(n)) return 'name';
  if (/(author|owner|creator|speaker|teacher|student|member|leader)$/i.test(n)) return 'name';
  if (/(date|_?time|_?at)$/i.test(n)) return 'date';
  if (/(title|subject|headline)/i.test(n)) return 'title';
  if (/(desc|description|summary|intro|bio|remark|comment|content)/i.test(n)) return 'description';
  if (/(^|_)(uuid|guid)$/i.test(n)) return 'uuid';
  if (/^(message|msg)$/i.test(n)) return 'message';
  return 'string';
}

/** 按字段名生成一个语义可信的字符串。 */
export function generateString(fieldName) {
  return generators[inferCategory(fieldName)]();
}

/**
 * 数字字段：优先使用字段声明的 min/max，其次按字段名给出合理区间。
 */
export function generateNumber(field) {
  if (typeof field.min === 'number' && typeof field.max === 'number') {
    if (field.min === field.max) return field.min;
    return round(field.min + Math.random() * (field.max - field.min));
  }
  const n = String(field.name ?? '');
  if (/age/i.test(n)) return 18 + randInt(48);
  if (/(percent|progress|ratio)/i.test(n)) return randInt(101);
  if (/year/i.test(n)) return 2000 + randInt(27);
  if (/(price|amount|fee|cost|money)/i.test(n)) return round(1 + Math.random() * 9999, 2);
  if (/(score|rating)/i.test(n)) return randInt(101);
  if (/(count|stock|num|quantity|total|size)/i.test(n)) return randInt(1001);
  if (typeof field.min === 'number') return round(field.min + Math.random() * 100);
  if (typeof field.max === 'number') return round(Math.random() * field.max);
  return randInt(101);
}

function round(v, digits = 0) {
  const k = 10 ** digits;
  return Math.round(v * k) / k;
}
