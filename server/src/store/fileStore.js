/**
 * 落盘存储：接口与模型定义保存在一个 JSON 文件中。
 * 写入采用「临时文件 + rename」的原子替换，避免中途崩溃写坏数据。
 */
import fs from 'node:fs';
import path from 'node:path';
import { seedData } from './seed.js';

export class FileStore {
  constructor(file) {
    this.file = file;
    this.data = { apis: [], models: [] };
    this.modelsById = new Map();
  }

  /** 启动时加载；文件不存在则写入一份示例数据，方便开箱即用。 */
  load() {
    if (fs.existsSync(this.file)) {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = {
        apis: Array.isArray(parsed.apis) ? parsed.apis : [],
        models: Array.isArray(parsed.models) ? parsed.models : [],
      };
    } else {
      this.data = seedData();
      this.persist();
    }
    this.reindex();
  }

  reindex() {
    this.modelsById = new Map(this.data.models.map((m) => [m.id, m]));
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  // ---- 模型 ----
  getModel(id) {
    return this.data.models.find((m) => m.id === id);
  }

  putModel(model) {
    const i = this.data.models.findIndex((m) => m.id === model.id);
    if (i >= 0) this.data.models[i] = model;
    else this.data.models.push(model);
    this.reindex();
    this.persist();
    return model;
  }

  deleteModel(id) {
    this.data.models = this.data.models.filter((m) => m.id !== id);
    this.reindex();
    this.persist();
  }

  // ---- 接口 ----
  getApi(id) {
    return this.data.apis.find((a) => a.id === id);
  }

  putApi(api) {
    const i = this.data.apis.findIndex((a) => a.id === api.id);
    if (i >= 0) this.data.apis[i] = api;
    else this.data.apis.push(api);
    this.persist();
    return api;
  }

  deleteApi(id) {
    this.data.apis = this.data.apis.filter((a) => a.id !== id);
    this.persist();
  }

  /** 按「方法 + 归一化路径」查找接口，供 Mock 分发使用。 */
  findApiByEndpoint(method, normalizedPath) {
    return this.data.apis.find((a) => a.method === method && a.path === normalizedPath);
  }
}
