/** 首次启动时的示例数据：一个 User 模型 + 一个带条件场景的用户列表接口。 */
import { randomUUID } from 'node:crypto';

export function seedData() {
  const now = new Date().toISOString();
  const userModel = {
    id: randomUUID(),
    name: 'User',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'phone', type: 'string' },
      { name: 'avatar', type: 'string' },
      { name: 'address', type: 'string' },
      { name: 'active', type: 'boolean' },
      { name: 'role', type: 'enum', values: ['admin', 'member', 'guest'] },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const listApi = {
    id: randomUUID(),
    name: '用户列表（示例）',
    path: '/users',
    method: 'GET',
    fields: [
      { name: 'code', type: 'number', min: 0, max: 0 },
      { name: 'message', type: 'string' },
      { name: 'total', type: 'number', min: 1, max: 200 },
      {
        name: 'data',
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: { type: 'model', modelId: userModel.id },
      },
    ],
    scenarios: [
      {
        id: randomUUID(),
        name: '空列表',
        conditions: [{ source: 'query', key: 'empty', op: 'eq', value: 'true' }],
        fields: [
          { name: 'code', type: 'number', min: 0, max: 0 },
          { name: 'message', type: 'string' },
          { name: 'total', type: 'number', min: 0, max: 0 },
          {
            name: 'data',
            type: 'array',
            minItems: 0,
            maxItems: 0,
            items: { type: 'model', modelId: userModel.id },
          },
        ],
      },
      {
        id: randomUUID(),
        name: '鉴权用户',
        conditions: [{ source: 'header', key: 'x-token', op: 'exists' }],
        fields: [
          { name: 'code', type: 'number', min: 0, max: 0 },
          { name: 'message', type: 'string' },
          { name: 'currentUser', type: 'model', modelId: userModel.id },
          {
            name: 'data',
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'model', modelId: userModel.id },
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  return { apis: [listApi], models: [userModel] };
}
