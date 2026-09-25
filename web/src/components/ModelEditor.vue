<script setup>
/** 模型编辑器：模型名 + 字段结构。模型可被接口或其它模型引用复用。 */
import { computed, ref } from 'vue';
import { api } from '../api';
import FieldList from './FieldList.vue';

const props = defineProps({
  source: { type: Object, default: null },
  models: { type: Array, default: () => [] },
});
const emit = defineEmits(['saved']);

const blank = () => ({ name: '', fields: [] });
const draft = ref(props.source ? structuredClone(props.source) : blank());
const saving = ref(false);
const errors = ref([]);
const message = ref('');

/** 可选模型里排除自身，避免最直接的自引用（更长的环由服务端检测）。 */
const selectableModels = computed(() =>
  props.models.filter((m) => m.id !== props.source?.id),
);

const structureJson = computed(() => {
  const { name, fields } = draft.value;
  return JSON.stringify({ name, fields }, null, 2);
});

async function save() {
  saving.value = true;
  errors.value = [];
  message.value = '';
  try {
    const saved = props.source?.id
      ? await api.updateModel(props.source.id, draft.value)
      : await api.createModel(draft.value);
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
      <input v-model="draft.name" class="name-input" placeholder="模型名称，如：User" />
      <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
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

    <FieldList :fields="draft.fields" :models="selectableModels" />

    <details class="structure">
      <summary>查看当前结构 JSON</summary>
      <pre class="json">{{ structureJson }}</pre>
    </details>
  </div>
</template>
