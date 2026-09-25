<script setup>
import { computed, onMounted, ref } from 'vue';
import { store, refresh } from './store';
import { api } from './api';
import ApiList from './components/ApiList.vue';
import ApiEditor from './components/ApiEditor.vue';
import ModelList from './components/ModelList.vue';
import ModelEditor from './components/ModelEditor.vue';

const view = ref('apis');
const selectedApiId = ref(null);
const selectedModelId = ref(null);
const draftNonce = ref(0); // 让「新建」能强制重置编辑器

onMounted(refresh);

const currentApi = computed(() => store.apis.find((a) => a.id === selectedApiId.value) ?? null);
const currentModel = computed(() => store.models.find((m) => m.id === selectedModelId.value) ?? null);

function newApi() {
  selectedApiId.value = null;
  draftNonce.value += 1;
}

function newModel() {
  selectedModelId.value = null;
  draftNonce.value += 1;
}

async function onApiSaved(id) {
  await refresh();
  selectedApiId.value = id;
}

async function onModelSaved(id) {
  await refresh();
  selectedModelId.value = id;
}

async function removeApi(a) {
  if (!window.confirm(`删除接口「${a.name}」（${a.method} ${a.path}）？`)) return;
  await api.deleteApi(a.id);
  if (selectedApiId.value === a.id) selectedApiId.value = null;
  await refresh();
}

async function removeModel(m) {
  if (!window.confirm(`删除模型「${m.name}」？`)) return;
  try {
    await api.deleteModel(m.id);
    if (selectedModelId.value === m.id) selectedModelId.value = null;
    await refresh();
  } catch (e) {
    window.alert(e.payload?.error?.message ?? e.message);
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">接口 Mock 平台</div>
      <nav class="nav">
        <button :class="{ active: view === 'apis' }" @click="view = 'apis'">接口</button>
        <button :class="{ active: view === 'models' }" @click="view = 'models'">公共模型</button>
      </nav>
      <span class="muted">定义即 Mock · 保存即可请求</span>
    </header>

    <div v-if="store.loadError" class="error-box banner">后端连接失败：{{ store.loadError }}</div>

    <main v-if="view === 'apis'" class="content">
      <ApiList
        :apis="store.apis"
        :selected-id="selectedApiId"
        @select="selectedApiId = $event"
        @create="newApi"
        @delete="removeApi"
      />
      <ApiEditor
        :key="`api-${selectedApiId ?? `new-${draftNonce}`}`"
        :source="currentApi"
        :models="store.models"
        @saved="onApiSaved"
      />
    </main>

    <main v-else class="content">
      <ModelList
        :models="store.models"
        :selected-id="selectedModelId"
        @select="selectedModelId = $event"
        @create="newModel"
        @delete="removeModel"
      />
      <ModelEditor
        :key="`model-${selectedModelId ?? `new-${draftNonce}`}`"
        :source="currentModel"
        :models="store.models"
        @saved="onModelSaved"
      />
    </main>
  </div>
</template>
