/**
 * Mock 请求分发：按「方法 + 路径」找到接口定义，
 * 依次匹配条件场景，用命中场景（或默认响应）的字段结构生成假数据返回。
 * 数据生成在 mock/generate.js，场景匹配在 mock/match.js，本文件只负责分发。
 */
import { matchScenario } from '../mock/match.js';
import { generateObject } from '../mock/generate.js';
import { normalizePath } from '../domain/validate.js';

export function mockHandler(store) {
  return (req, res) => {
    const path = normalizePath(req.path === '' ? '/' : req.path);
    const api = store.findApiByEndpoint(req.method, path);
    if (!api) {
      return res.status(404).json({
        error: {
          code: 'MOCK_NOT_FOUND',
          message: `未找到 ${req.method} ${path} 的 Mock 定义`,
        },
      });
    }
    const scenario = matchScenario(api.scenarios, {
      query: req.query,
      headers: req.headers,
    });
    const fields = scenario ? scenario.fields : api.fields;
    const body = generateObject(fields, { modelsById: store.modelsById });
    res.set('x-mock-scenario', encodeURIComponent(scenario ? scenario.name : 'default'));
    return res.json(body);
  };
}
