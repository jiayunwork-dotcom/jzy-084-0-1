/**
 * 定义校验：路径合法性、字段结构合法性、接口/模型载荷校验。
 * 所有校验在保存时完成，返回结构化的错误明细数组，
 * 保证非法定义不会留到 Mock 请求时才暴露。
 */

export const FIELD_TYPES = ['string', 'number', 'boolean', 'enum', 'array', 'object', 'model'];
export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
export const CONDITION_SOURCES = ['query', 'header'];
export const CONDITION_OPS = ['eq', 'exists'];

/** 路径必须以 / 开头、不允许连续双斜杠、不允许空白字符。 */
export function validatePath(path) {
  const errors = [];
  if (typeof path !== 'string' || path.length === 0) {
    errors.push({ field: 'path', message: '路径不能为空' });
    return errors;
  }
  if (!path.startsWith('/')) {
    errors.push({ field: 'path', message: '路径必须以斜杠 / 开头' });
  }
  if (path.includes('//')) {
    errors.push({ field: 'path', message: '路径不允许包含连续的双斜杠 //' });
  }
  if (/\s/.test(path)) {
    errors.push({ field: 'path', message: '路径不允许包含空白字符' });
  }
  if (path.length > 200) {
    errors.push({ field: 'path', message: '路径长度不能超过 200 个字符' });
  }
  return errors;
}

/** 归一化路径：去掉末尾多余斜杠（根路径除外），用于唯一性比较与 Mock 匹配。 */
export function normalizePath(path) {
  if (typeof path !== 'string') return path;
  if (path.length > 1) return path.replace(/\/+$/, '');
  return path;
}

/**
 * 校验字段列表。modelsById 为 Map<modelId, model>，用于校验模型引用是否存在。
 * path 参数用于生成嵌套的错误定位，如 fields[2].fields[0].name。
 */
export function validateFields(fields, modelsById, path = 'fields') {
  const errors = [];
  if (!Array.isArray(fields)) {
    return [{ field: path, message: '字段列表必须是数组' }];
  }
  const seen = new Set();
  fields.forEach((f, i) => {
    const loc = `${path}[${i}]`;
    if (!f || typeof f !== 'object') {
      errors.push({ field: loc, message: '字段定义必须是对象' });
      return;
    }
    const name = typeof f.name === 'string' ? f.name.trim() : '';
    if (!name) {
      errors.push({ field: `${loc}.name`, message: '字段名不能为空' });
    } else if (seen.has(name)) {
      errors.push({ field: `${loc}.name`, message: `同一层级下字段名 "${name}" 重复` });
    } else {
      seen.add(name);
    }
    validateDescriptor(f, modelsById, loc, errors);
  });
  return errors;
}

/** 校验单个字段描述符（数组元素描述符没有 name，也走这里）。 */
function validateDescriptor(f, modelsById, loc, errors) {
  if (!FIELD_TYPES.includes(f.type)) {
    errors.push({ field: `${loc}.type`, message: `未知的字段类型 "${f.type}"` });
    return;
  }
  switch (f.type) {
    case 'enum':
      if (!Array.isArray(f.values) || f.values.length === 0) {
        errors.push({ field: `${loc}.values`, message: `枚举字段 "${f.name ?? loc}" 至少需要一个候选值` });
      } else if (f.values.some((v) => typeof v !== 'string' || v.length === 0)) {
        errors.push({ field: `${loc}.values`, message: '枚举候选值必须是非空字符串' });
      }
      break;
    case 'model':
      if (!f.modelId) {
        errors.push({ field: `${loc}.modelId`, message: '模型引用必须选择一个模型' });
      } else if (modelsById && !modelsById.has(f.modelId)) {
        errors.push({ field: `${loc}.modelId`, message: `引用的模型不存在（id: ${f.modelId}）` });
      }
      break;
    case 'object':
      errors.push(...validateFields(f.fields ?? [], modelsById, `${loc}.fields`));
      break;
    case 'array': {
      if (!f.items || typeof f.items !== 'object') {
        errors.push({ field: `${loc}.items`, message: '数组字段必须声明元素类型' });
        break;
      }
      validateDescriptor(f.items, modelsById, `${loc}.items`, errors);
      const { minItems, maxItems } = f;
      if (minItems !== undefined && (!Number.isInteger(minItems) || minItems < 0)) {
        errors.push({ field: `${loc}.minItems`, message: 'minItems 必须是非负整数' });
      }
      if (maxItems !== undefined && (!Number.isInteger(maxItems) || maxItems < 0)) {
        errors.push({ field: `${loc}.maxItems`, message: 'maxItems 必须是非负整数' });
      }
      if (Number.isInteger(minItems) && Number.isInteger(maxItems) && minItems > maxItems) {
        errors.push({ field: `${loc}.maxItems`, message: 'maxItems 不能小于 minItems' });
      }
      break;
    }
    case 'number': {
      const { min, max } = f;
      if (min !== undefined && typeof min !== 'number') {
        errors.push({ field: `${loc}.min`, message: 'min 必须是数字' });
      }
      if (max !== undefined && typeof max !== 'number') {
        errors.push({ field: `${loc}.max`, message: 'max 必须是数字' });
      }
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        errors.push({ field: `${loc}.max`, message: 'max 不能小于 min' });
      }
      break;
    }
    default:
      break;
  }
}

function validateConditions(conditions, loc) {
  const errors = [];
  if (!Array.isArray(conditions)) {
    return [{ field: `${loc}.conditions`, message: '匹配条件必须是数组' }];
  }
  conditions.forEach((c, j) => {
    const cloc = `${loc}.conditions[${j}]`;
    if (!c || typeof c !== 'object') {
      errors.push({ field: cloc, message: '条件必须是对象' });
      return;
    }
    if (!CONDITION_SOURCES.includes(c.source)) {
      errors.push({ field: `${cloc}.source`, message: '条件来源必须是 query 或 header' });
    }
    if (typeof c.key !== 'string' || !c.key.trim()) {
      errors.push({ field: `${cloc}.key`, message: '条件的键不能为空' });
    }
    if (!CONDITION_OPS.includes(c.op)) {
      errors.push({ field: `${cloc}.op`, message: '条件的操作符必须是 eq 或 exists' });
    }
    if (c.op === 'eq' && typeof c.value !== 'string') {
      errors.push({ field: `${cloc}.value`, message: 'eq 条件必须提供字符串比较值' });
    }
  });
  return errors;
}

/** 校验接口定义载荷（新建与更新共用）。 */
export function validateApiPayload(body, modelsById) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return [{ field: '', message: '请求体必须是 JSON 对象' }];
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.push({ field: 'name', message: '接口名称不能为空' });
  }
  errors.push(...validatePath(body.path));
  const method = typeof body.method === 'string' ? body.method.toUpperCase() : '';
  if (!METHODS.includes(method)) {
    errors.push({ field: 'method', message: `请求方法必须是 ${METHODS.join(' / ')} 之一` });
  }
  errors.push(...validateFields(body.fields ?? [], modelsById, 'fields'));
  if (body.scenarios !== undefined) {
    if (!Array.isArray(body.scenarios)) {
      errors.push({ field: 'scenarios', message: '场景列表必须是数组' });
    } else {
      body.scenarios.forEach((s, i) => {
        const loc = `scenarios[${i}]`;
        if (!s || typeof s !== 'object') {
          errors.push({ field: loc, message: '场景必须是对象' });
          return;
        }
        if (typeof s.name !== 'string' || !s.name.trim()) {
          errors.push({ field: `${loc}.name`, message: '场景名称不能为空' });
        }
        errors.push(...validateConditions(s.conditions ?? [], loc));
        errors.push(...validateFields(s.fields ?? [], modelsById, `${loc}.fields`));
      });
    }
  }
  return errors;
}

/** 校验模型定义载荷（新建与更新共用）。 */
export function validateModelPayload(body, modelsById) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return [{ field: '', message: '请求体必须是 JSON 对象' }];
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.push({ field: 'name', message: '模型名称不能为空' });
  } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(body.name.trim())) {
    errors.push({ field: 'name', message: '模型名称须以字母或下划线开头，仅含字母、数字、下划线' });
  }
  errors.push(...validateFields(body.fields ?? [], modelsById, 'fields'));
  return errors;
}
