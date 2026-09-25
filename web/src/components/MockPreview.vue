<script setup>
/** Mock 试用：向生成的 Mock 端点发起请求并展示返回的假数据。 */
import { computed, ref } from 'vue';

const props = defineProps({
  api: { type: Object, required: true },
});

const queryRows = ref([{ key: '', value: '' }]);
const headerRows = ref([{ key: '', value: '' }]);
const sending = ref(false);
const result = ref(null);
const error = ref('');

const url = computed(() => {
  const qs = queryRows.value
    .filter((r) => r.key)
    .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
    .join('&');
  return `/mock${props.api.path}${qs ? `?${qs}` : ''}`;
});

const curl = computed(() => {
  const hs = headerRows.value
    .filter((r) => r.key)
    .map((r) => ` \\\n  -H '${r.key}: ${r.value}'`)
    .join('');
  return `curl -X ${props.api.method}${hs} \\\n  '${window.location.origin}${url.value}'`;
});

function addRow(rows) {
  rows.push({ key: '', value: '' });
}

function removeRow(rows, i) {
  rows.splice(i, 1);
}

async function send() {
  sending.value = true;
  result.value = null;
  error.value = '';
  const headers = {};
  for (const r of headerRows.value) if (r.key) headers[r.key] = r.value;
  const t0 = performance.now();
  try {
    const res = await fetch(url.value, { method: props.api.method, headers });
    const body = await res.json().catch(() => null);
    result.value = {
      status: res.status,
      scenario: res.headers.get('x-mock-scenario'),
      body,
      ms: Math.round(performance.now() - t0),
    };
  } catch (e) {
    error.value = e.message;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="mock-preview">
    <div class="endpoint-line">
      <span class="method" :data-m="api.method">{{ api.method }}</span>
      <code class="url">{{ url }}</code>
      <button class="primary sm" :disabled="sending" @click="send">{{ sending ? '请求中…' : '发送请求' }}</button>
    </div>
    <pre class="curl">{{ curl }}</pre>

    <div class="kv-block">
      <div class="block-title">查询参数（用于触发条件场景）</div>
      <div v-for="(r, i) in queryRows" :key="i" class="kv-line">
        <input v-model="r.key" placeholder="参数名" />
        <input v-model="r.value" placeholder="参数值" />
        <button class="icon danger" @click="removeRow(queryRows, i)">✕</button>
      </div>
      <button class="ghost sm" @click="addRow(queryRows)">+ 添加参数</button>
    </div>

    <div class="kv-block">
      <div class="block-title">请求头</div>
      <div v-for="(r, i) in headerRows" :key="i" class="kv-line">
        <input v-model="r.key" placeholder="头名称，如 x-token" />
        <input v-model="r.value" placeholder="值" />
        <button class="icon danger" @click="removeRow(headerRows, i)">✕</button>
      </div>
      <button class="ghost sm" @click="addRow(headerRows)">+ 添加请求头</button>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
    <div v-if="result" class="result">
      <div class="result-meta">
        <span class="badge" :class="result.status < 400 ? 'ok' : 'bad'">HTTP {{ result.status }}</span>
        <span class="badge">场景：{{ result.scenario ? decodeURIComponent(result.scenario) : 'default' }}</span>
        <span class="muted">{{ result.ms }} ms</span>
        <button class="ghost sm" @click="send">重新生成</button>
      </div>
      <pre class="json">{{ JSON.stringify(result.body, null, 2) }}</pre>
    </div>
  </div>
</template>
