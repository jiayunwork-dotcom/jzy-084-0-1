/** 管理接口的 fetch 封装：非 2xx 时抛出携带服务端结构化错误 payload 的异常。 */
async function json(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error?.message || `请求失败（${res.status}）`);
    err.payload = data;
    throw err;
  }
  return data;
}

const post = (url, body, method = 'POST') =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json);

export const api = {
  listApis: () => fetch('/api/apis').then(json),
  createApi: (body) => post('/api/apis', body),
  updateApi: (id, body) => post(`/api/apis/${id}`, body, 'PUT'),
  deleteApi: (id) => fetch(`/api/apis/${id}`, { method: 'DELETE' }).then((r) => (r.ok ? null : json(r))),

  listModels: () => fetch('/api/models').then(json),
  createModel: (body) => post('/api/models', body),
  updateModel: (id, body) => post(`/api/models/${id}`, body, 'PUT'),
  deleteModel: (id) => fetch(`/api/models/${id}`, { method: 'DELETE' }).then((r) => (r.ok ? null : json(r))),
};
