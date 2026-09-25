/**
 * 公共模型循环引用检测。
 * 模型通过字段（含嵌套对象、数组元素）引用其它模型，构成有向图；
 * 保存模型时对全图做 DFS，发现回边即构成环，返回环上的模型名序列。
 */

/** 收集一组字段里出现的全部模型引用 id（递归穿透 object / array）。 */
export function collectModelRefs(fields, out = new Set()) {
  for (const f of fields ?? []) {
    if (!f || typeof f !== 'object') continue;
    if (f.type === 'model' && f.modelId) out.add(f.modelId);
    if (f.type === 'object') collectModelRefs(f.fields, out);
    if (f.type === 'array' && f.items) collectModelRefs([f.items], out);
  }
  return out;
}

/**
 * 在模型列表中检测循环引用。
 * @param {Array<{id:string,name:string,fields:Array}>} models
 * @returns {string[]|null} 构成环的模型名序列（首尾相同，如 ['甲','乙','甲']），无环返回 null。
 */
export function findCycle(models) {
  const byId = new Map(models.map((m) => [m.id, m]));
  const graph = new Map(models.map((m) => [m.id, [...collectModelRefs(m.fields)]]));
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map(models.map((m) => [m.id, WHITE]));
  const stack = [];
  let cycle = null;

  function dfs(u) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of graph.get(u) ?? []) {
      if (!byId.has(v)) continue; // 悬空引用由定义校验负责报告
      if (color.get(v) === GRAY) {
        cycle = stack.slice(stack.indexOf(v)).concat(v);
        return true;
      }
      if (color.get(v) === WHITE && dfs(v)) return true;
    }
    stack.pop();
    color.set(u, BLACK);
    return false;
  }

  for (const m of models) {
    if (color.get(m.id) === WHITE && dfs(m.id)) break;
  }
  if (!cycle) return null;
  return cycle.map((id) => byId.get(id)?.name ?? id);
}
