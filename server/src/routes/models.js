/**
 * 模型读写路由：校验 -> 循环引用检测 -> 落盘。
 */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateModelPayload } from '../domain/validate.js';
import { findCycle, collectModelRefs } from '../domain/cycles.js';
import { ApiError, validationError, notFound } from '../errors.js';

export function modelsRouter(store) {
  const r = Router();

  r.get('/', (req, res) => {
    res.json(store.data.models);
  });

  r.get('/:id', (req, res, next) => {
    const model = store.getModel(req.params.id);
    if (!model) return next(notFound(`模型不存在（id: ${req.params.id}）`));
    return res.json(model);
  });

  r.post('/', (req, res, next) => {
    try {
      const errors = validateModelPayload(req.body, store.modelsById);
      if (errors.length) throw validationError(errors);
      const name = req.body.name.trim();
      if (store.data.models.some((m) => m.name === name)) {
        throw new ApiError(409, 'DUPLICATE_MODEL', `模型名称 "${name}" 已存在`);
      }
      const now = new Date().toISOString();
      const model = {
        id: randomUUID(),
        name,
        fields: req.body.fields ?? [],
        createdAt: now,
        updatedAt: now,
      };
      // 新模型加入后的全图成环检测（覆盖自引用与经由其它模型的环）
      const cycle = findCycle([...store.data.models, model]);
      if (cycle) {
        throw new ApiError(400, 'CIRCULAR_REFERENCE', `检测到循环引用：${cycle.join(' → ')}`, { cycle });
      }
      store.putModel(model);
      return res.status(201).json(model);
    } catch (e) {
      return next(e);
    }
  });

  r.put('/:id', (req, res, next) => {
    try {
      const existing = store.getModel(req.params.id);
      if (!existing) throw notFound(`模型不存在（id: ${req.params.id}）`);
      const errors = validateModelPayload(req.body, store.modelsById);
      if (errors.length) throw validationError(errors);
      const name = req.body.name.trim();
      if (store.data.models.some((m) => m.id !== existing.id && m.name === name)) {
        throw new ApiError(409, 'DUPLICATE_MODEL', `模型名称 "${name}" 已存在`);
      }
      const updated = {
        ...existing,
        name,
        fields: req.body.fields ?? [],
        updatedAt: new Date().toISOString(),
      };
      // 用更新后的定义替换旧定义再做全图成环检测
      const candidate = store.data.models.map((m) => (m.id === existing.id ? updated : m));
      const cycle = findCycle(candidate);
      if (cycle) {
        throw new ApiError(400, 'CIRCULAR_REFERENCE', `检测到循环引用：${cycle.join(' → ')}`, { cycle });
      }
      store.putModel(updated);
      return res.json(updated);
    } catch (e) {
      return next(e);
    }
  });

  r.delete('/:id', (req, res, next) => {
    try {
      const existing = store.getModel(req.params.id);
      if (!existing) throw notFound(`模型不存在（id: ${req.params.id}）`);
      // 被其它模型或接口引用时拒绝删除，并指出引用方
      const referrers = [];
      for (const m of store.data.models) {
        if (m.id !== existing.id && collectModelRefs(m.fields).has(existing.id)) {
          referrers.push(`模型 ${m.name}`);
        }
      }
      for (const a of store.data.apis) {
        const refs = collectModelRefs(a.fields);
        for (const s of a.scenarios ?? []) collectModelRefs(s.fields, refs);
        if (refs.has(existing.id)) referrers.push(`接口 ${a.name}`);
      }
      if (referrers.length) {
        throw new ApiError(409, 'MODEL_IN_USE', `模型正被引用，无法删除：${referrers.join('、')}`, {
          referrers,
        });
      }
      store.deleteModel(existing.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  });

  return r;
}
