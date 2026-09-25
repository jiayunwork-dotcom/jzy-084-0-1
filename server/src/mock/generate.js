/**
 * 假数据递归生成器。
 * 只依赖字段定义与模型表（ctx.modelsById），不感知任何 HTTP 概念；
 * 请求分发在 routes/mock.js，二者互不耦合。
 */
import { generateString, generateNumber } from './infer.js';

/** 防御性递归深度上限：正常定义在保存时已排除循环引用，这里兜底防无限递归。 */
const MAX_DEPTH = 24;

const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];

/**
 * 按字段列表生成一个对象。
 * @param {Array} fields 字段定义列表
 * @param {{modelsById: Map<string, object>}} ctx
 */
export function generateObject(fields, ctx) {
  const obj = {};
  for (const f of fields ?? []) {
    if (f && typeof f.name === 'string' && f.name) {
      obj[f.name] = generateField(f, ctx, 0);
    }
  }
  return obj;
}

/** 按单个字段描述符生成值（数组元素描述符没有 name 时也走这里）。 */
export function generateField(field, ctx, depth) {
  if (depth > MAX_DEPTH) return null;
  switch (field.type) {
    case 'string':
      return generateString(field.name);
    case 'number':
      return generateNumber(field);
    case 'boolean':
      return Math.random() < 0.5;
    case 'enum':
      return pick(field.values);
    case 'array': {
      const min = field.minItems ?? 1;
      const max = field.maxItems ?? 5;
      const count = min + randInt(max - min + 1);
      const itemName = field.items.name ?? singular(field.name);
      return Array.from({ length: count }, () =>
        generateField({ ...field.items, name: itemName }, ctx, depth + 1),
      );
    }
    case 'object': {
      const obj = {};
      for (const f of field.fields ?? []) {
        if (f && f.name) obj[f.name] = generateField(f, ctx, depth + 1);
      }
      return obj;
    }
    case 'model': {
      const model = ctx.modelsById.get(field.modelId);
      if (!model) return null; // 保存时已校验引用存在，这里仅作防御
      const obj = {};
      for (const f of model.fields ?? []) {
        if (f && f.name) obj[f.name] = generateField(f, ctx, depth + 1);
      }
      return obj;
    }
    default:
      return null;
  }
}

/** 数组元素做字符串推测时，用单数化的字段名（tags -> tag）提高语义命中率。 */
function singular(name = '') {
  return name.endsWith('s') && name.length > 1 ? name.slice(0, -1) : name;
}
