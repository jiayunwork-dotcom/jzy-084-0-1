# 接口 Mock 平台

团队内部使用的接口 Mock 平台：在浏览器里以表单方式定义接口结构，保存后立即生成可请求的 Mock 端点，返回结构合理、字段可信的假数据，让前端在真实后端就绪前就能联调。

## 快速开始

```bash
docker compose up --build
```

- 界面：http://localhost:8080
- 后端：http://localhost:3000（健康检查 `/api/health`）
- Mock 端点统一挂在 `/mock` 前缀下，例如定义了 `GET /users`，即可请求 `http://localhost:8080/mock/users`
- 接口与模型定义持久化在命名卷 `mock-data` 中（容器内 `/data/store.json`），重启不丢失

首次启动会写入一份示例数据（`User` 模型 + 带条件场景的用户列表接口），方便直接体验。

## 功能

- **接口定义（纯表单）**：请求路径 + 请求方法 + 响应体字段结构；字段类型涵盖字符串、数字、布尔、枚举、数组、嵌套对象、模型引用
- **公共模型**：单独定义，可被多个接口或其它模型引用复用，支持「模型引用模型」的多层嵌套
- **可信假数据**：按字段名智能推测（name→人名、email→邮箱、phone→手机号、address→地址、url→链接、avatar→图片链接，识别不出回退通用随机字符串）；数字按字段名/声明区间取值；数组随机 1–5 个元素（可调）并递归生成
- **条件 Mock**：同一接口可配多套响应场景，每套场景带一组基于 query/header 的匹配条件；按声明顺序取第一个命中，都不命中走默认响应；响应头 `x-mock-scenario` 标明命中了哪套场景
- **保存即校验**：路径合法性、「路径+方法」唯一性、循环引用检测（指出构成环的模型）、枚举候选值非空、模型引用存在性等，全部在保存时以结构化错误返回

## 本地开发

```bash
# 后端（http://localhost:3000）
cd server && npm install && npm run dev

# 前端（http://localhost:5173，已配置 /api 与 /mock 代理到 3000）
cd web && npm install && npm run dev
```

## 测试

```bash
cd server && npm test
```

覆盖：字段名语义推测（邮箱字段确实产出邮箱）、模型多层递归展开、循环引用检测与拒绝、路径合法性与「路径+方法」唯一性、条件场景按声明顺序取首个命中，以及保存→Mock 请求的端到端链路。

## 目录结构

```
server/
  src/
    domain/validate.js   # 定义校验（路径、字段、场景条件）
    domain/cycles.js     # 公共模型循环引用检测
    mock/infer.js        # 字段名语义推测 + 各类别假数据生成器
    mock/generate.js     # 按字段结构递归生成假数据（与 HTTP 解耦）
    mock/match.js        # 条件场景匹配（顺序即优先级）
    routes/apis.js       # 接口读写
    routes/models.js     # 模型读写
    routes/mock.js       # Mock 请求分发
    store/fileStore.js   # JSON 落盘持久化（原子写）
    store/seed.js        # 首次启动的示例数据
  tests/                 # node:test 测试
web/
  src/components/
    ApiEditor.vue        # 接口编辑
    ModelEditor.vue      # 模型编辑
    FieldList.vue        # 递归字段编辑器
    ScenarioList.vue     # 条件场景编辑（含优先级调整）
    MockPreview.vue      # Mock 结果预览（一键发请求）
    ApiList.vue / ModelList.vue
```

## 管理接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/api/apis` | 接口列表 / 新建接口 |
| GET/PUT/DELETE | `/api/apis/:id` | 接口详情 / 更新 / 删除 |
| GET/POST | `/api/models` | 模型列表 / 新建模型 |
| GET/PUT/DELETE | `/api/models/:id` | 模型详情 / 更新 / 删除（被引用时拒绝） |
| ANY | `/mock<已定义路径>` | Mock 端点 |

错误响应统一为 `{ "error": { "code", "message", "details?" } }`，如 `VALIDATION_ERROR`、`DUPLICATE_ENDPOINT`、`CIRCULAR_REFERENCE`（details.cycle 给出环上的模型名）。
