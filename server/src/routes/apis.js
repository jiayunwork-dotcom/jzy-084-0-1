/**
 * 接口读写路由：校验 -> 「路径+方法」唯一性检查 -> 落盘。
 */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateApiPayload, normalizePath } from '../domain/validate.js';
import { ApiError, validationError, notFound } from '../errors.js';

export function apisRouter(store) {
  const r = Router();

  r.get('/', (req, res) => {
    res.json(store.data.apis);
  });

  r.get('/:id', (req, res, next) => {
    const api = store.getApi(req.params.id);
    if (!api) return next(notFound(`接口不存在（id: ${req.params.id}）`));
    return res.json(api);
  });

  r.post('/', (req, res, next) => {
    try {
      const errors = validateApiPayload(req.body, store.modelsById);
      if (errors.length) throw validationError(errors);
      const path = normalizePath(req.body.path);
      const method = req.body.method.toUpperCase();
      ensureEndpointUnique(store, method, path, null);
      const now = new Date().toISOString();
      const api = {
        id: randomUUID(),
        name: req.body.name.trim(),
        path,
        method,
        fields: req.body.fields ?? [],
        scenarios: normalizeScenarios(req.body.scenarios),
        createdAt: now,
        updatedAt: now,
      };
      store.putApi(api);
      return res.status(201).json(api);
    } catch (e) {
      return next(e);
    }
  });

  r.put('/:id', (req, res, next) => {
    try {
      const existing = store.getApi(req.params.id);
      if (!existing) throw notFound(`接口不存在（id: ${req.params.id}）`);
      const errors = validateApiPayload(req.body, store.modelsById);
      if (errors.length) throw validationError(errors);
      const path = normalizePath(req.body.path);
      const method = req.body.method.toUpperCase();
      ensureEndpointUnique(store, method, path, existing.id);
      const api = {
        ...existing,
        name: req.body.name.trim(),
        path,
        method,
        fields: req.body.fields ?? [],
        scenarios: normalizeScenarios(req.body.scenarios),
        updatedAt: new Date().toISOString(),
      };
      store.putApi(api);
      return res.json(api);
    } catch (e) {
      return next(e);
    }
  });

  r.delete('/:id', (req, res, next) => {
    try {
      const existing = store.getApi(req.params.id);
      if (!existing) throw notFound(`接口不存在（id: ${req.params.id}）`);
      store.deleteApi(existing.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  });

  return r;
}

/** 「路径 + 方法」组合在全局唯一（excludeId 用于更新时排除自身）。 */
function ensureEndpointUnique(store, method, path, excludeId) {
  const dup = store.data.apis.find(
    (a) => a.id !== excludeId && a.method === method && a.path === path,
  );
  if (dup) {
    throw new ApiError(
      409,
      'DUPLICATE_ENDPOINT',
      `接口 ${method} ${path} 已存在（"${dup.name}"），同一路径加方法的组合不允许重复`,
    );
  }
}

/** 为场景补齐 id，保持声明顺序（顺序即匹配优先级）。 */
function normalizeScenarios(scenarios) {
  if (!Array.isArray(scenarios)) return [];
  return scenarios.map((s) => ({
    id: s.id || randomUUID(),
    name: s.name.trim(),
    conditions: s.conditions ?? [],
    fields: s.fields ?? [],
  }));
}
