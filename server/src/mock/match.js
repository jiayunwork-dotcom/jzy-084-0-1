/**
 * 条件场景匹配：按场景的声明顺序依次判定，命中的第一套场景生效。
 * 入参是抽象的 { query, headers }，与 Express 解耦，便于单测。
 */

/**
 * @param {Array<{name:string, conditions:Array, fields:Array}>} scenarios
 * @param {{query: object, headers: object}} reqLike
 * @returns {object|null} 命中的场景；都不命中返回 null（调用方走默认响应）。
 */
export function matchScenario(scenarios = [], reqLike) {
  for (const scenario of scenarios) {
    if (conditionsMatch(scenario.conditions ?? [], reqLike)) {
      return scenario;
    }
  }
  return null;
}

/** 一个场景的所有条件为「与」关系；条件为空视为恒命中（由声明顺序决定是否生效）。 */
function conditionsMatch(conditions, reqLike) {
  return conditions.every((c) => {
    const actual =
      c.source === 'header'
        ? reqLike.headers[String(c.key).toLowerCase()]
        : reqLike.query[c.key];
    if (c.op === 'exists') return actual !== undefined;
    // eq：统一按字符串比较
    if (actual === undefined) return false;
    return String(actual) === c.value;
  });
}
