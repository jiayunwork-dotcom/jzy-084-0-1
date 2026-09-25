<script setup>
/** 接口编辑器：基本信息 + 默认响应结构 + 条件场景 + Mock 试用。 */
import { computed, ref } from 'vue';
import { api } from '../api';
import FieldList from './FieldList.vue';
import ScenarioList from './ScenarioList.vue';
import MockPreview from './MockPreview.vue';

const props = defineProps({
  source: { type: Object, default: null },
  models: { type: Array, default: () => [] },
});
const emit = defineEmits(['saved']);

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const blank = () => ({ name: '', path: '/', method: 'GET', fields: [], scenarios: [] });
const draft = ref(props.source ? structuredClone(props.source) : blank());
const tab = ref('fields');
const saving = ref(false);
const errors = ref([]);
const message = ref('');

const isPersisted = computed(() => Boolean(props.source?.id));

/** 即时展示当前定义的结构（提交给服务端的就是这份 JSON）。 */
const structureJson = computed(() => {
  const { name, path, method, fields, scenarios } = draft.value;
  return JSON.stringify({ name, path, method, fields, scenarios }, null, 2);
});

async function save() {
  saving.value = true;
  errors.value = [];
  message.value = '';
  try {
    const saved = props.source?.id
      ? await api.updateApi(props.source.id, draft.value)
      : await api.createApi(draft.value);
    message.value = '已保存 ✓';
    emit('saved', saved.id);
  } catch (e) {
    const err = e.payload?.error;
    errors.value = Array.isArray(err?.details)
      ? err.details
      : [{ field: '', message: err?.message ?? e.message }];
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="editor card">
    <div class="editor-head">
      <input v-model="draft.name" class="name-input" placeholder="接口名称，如：用户列表" />
      <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
    </div>

    <div class="endpoint-row">
      <select v-model="draft.method" class="method-select">
        <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
      </select>
      <input v-model="draft.path" class="path-input" placeholder="/api/example" />
      <code class="mock-url">Mock 地址：/mock{{ draft.path }}</code>
    </div>

    <div v-if="errors.length" class="error-box">
      <b>保存失败：</b>
      <ul>
        <li v-for="(e, i) in errors" :key="i">
          <code v-if="e.field">{{ e.field }}</code> {{ e.message }}
        </li>
      </ul>
    </div>
    <div v-if="message" class="ok-box">{{ message }}</div>

    <div class="tabs">
      <button :class="{ active: tab === 'fields' }" @click="tab = 'fields'">默认响应结构</button>
      <button :class="{ active: tab === 'scenarios' }" @click="tab = 'scenarios'">
        条件场景（{{ draft.scenarios.length }}）
      </button>
      <button :class="{ active: tab === 'preview' }" @click="tab = 'preview'">Mock 试用</button>
    </div>

    <div v-show="tab === 'fields'">
      <FieldList :fields="draft.fields" :models="models" />
      <details class="structure">
        <summary>查看当前结构 JSON</summary>
        <pre class="json">{{ structureJson }}</pre>
      </details>
    </div>

    <div v-show="tab === 'scenarios'">
      <ScenarioList :scenarios="draft.scenarios" :models="models" />
    </div>

    <div v-show="tab === 'preview'">
      <MockPreview v-if="isPersisted" :api="draft" />
      <p v-else class="hint">保存后即可在此向 Mock 端点发起请求。</p>
    </div>
  </div>
</template>
