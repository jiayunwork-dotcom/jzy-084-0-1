<script setup>
/**
 * 递归字段编辑器：渲染一组字段定义，对象/数组元素为对象时递归渲染自身。
 * 直接就地修改 props.fields（编辑器整体工作在草稿深拷贝上，保存时整体提交）。
 */
const props = defineProps({
  fields: { type: Array, required: true },
  models: { type: Array, default: () => [] },
});

const TYPES = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'enum', label: '枚举' },
  { value: 'array', label: '数组' },
  { value: 'object', label: '对象' },
  { value: 'model', label: '模型引用' },
];

function addField() {
  props.fields.push({ name: '', type: 'string' });
}

function removeField(i) {
  props.fields.splice(i, 1);
}

/** 切换字段类型时清掉旧类型配置，初始化新类型配置。 */
function onTypeChange(f) {
  for (const k of ['values', 'items', 'fields', 'modelId', 'min', 'max', 'minItems', 'maxItems']) {
    delete f[k];
  }
  if (f.type === 'enum') f.values = ['选项一', '选项二'];
  if (f.type === 'object') f.fields = [];
  if (f.type === 'array') {
    f.items = { type: 'string' };
    f.minItems = 1;
    f.maxItems = 5;
  }
  if (f.type === 'model') f.modelId = props.models[0]?.id ?? '';
}

function onItemTypeChange(f) {
  const it = f.items;
  for (const k of ['values', 'fields', 'modelId', 'min', 'max']) delete it[k];
  if (it.type === 'enum') it.values = ['选项一', '选项二'];
  if (it.type === 'object') it.fields = [];
  if (it.type === 'model') it.modelId = props.models[0]?.id ?? '';
}

function setEnum(obj, e) {
  obj.values = e.target.value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function setNum(obj, key, e) {
  const v = e.target.value;
  obj[key] = v === '' ? undefined : Number(v);
}
</script>

<template>
  <div class="field-list">
    <div v-for="(f, i) in fields" :key="i" class="field-row">
      <div class="field-line">
        <input v-model="f.name" class="fname" placeholder="字段名" />
        <select v-model="f.type" class="ftype" @change="onTypeChange(f)">
          <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>

        <template v-if="f.type === 'number'">
          <input type="number" class="num" title="最小值" placeholder="min" :value="f.min" @change="(e) => setNum(f, 'min', e)" />
          <input type="number" class="num" title="最大值" placeholder="max" :value="f.max" @change="(e) => setNum(f, 'max', e)" />
        </template>

        <input
          v-if="f.type === 'enum'"
          class="grow"
          placeholder="候选值，用逗号分隔"
          :value="(f.values ?? []).join(', ')"
          @change="(e) => setEnum(f, e)"
        />

        <select v-if="f.type === 'model'" v-model="f.modelId" class="grow">
          <option value="" disabled>选择模型</option>
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>

        <template v-if="f.type === 'array'">
          <span class="lbl">元素</span>
          <select v-model="f.items.type" class="ftype" @change="onItemTypeChange(f)">
            <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <input type="number" class="num" title="最少元素个数" placeholder="最少" :value="f.minItems" @change="(e) => setNum(f, 'minItems', e)" />
          <input type="number" class="num" title="最多元素个数" placeholder="最多" :value="f.maxItems" @change="(e) => setNum(f, 'maxItems', e)" />
        </template>

        <button class="icon danger" title="删除字段" @click="removeField(i)">✕</button>
      </div>

      <!-- 数组元素的附加配置 -->
      <div v-if="f.type === 'array' && ['enum', 'model', 'number'].includes(f.items.type)" class="sub-line">
        <span class="lbl">元素配置</span>
        <input
          v-if="f.items.type === 'enum'"
          class="grow"
          placeholder="候选值，用逗号分隔"
          :value="(f.items.values ?? []).join(', ')"
          @change="(e) => setEnum(f.items, e)"
        />
        <select v-if="f.items.type === 'model'" v-model="f.items.modelId" class="grow">
          <option value="" disabled>选择模型</option>
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <template v-if="f.items.type === 'number'">
          <input type="number" class="num" title="最小值" placeholder="min" :value="f.items.min" @change="(e) => setNum(f.items, 'min', e)" />
          <input type="number" class="num" title="最大值" placeholder="max" :value="f.items.max" @change="(e) => setNum(f.items, 'max', e)" />
        </template>
      </div>
      <div v-if="f.type === 'array' && f.items.type === 'object'" class="nested">
        <FieldList :fields="f.items.fields" :models="models" />
      </div>

      <!-- 嵌套对象 -->
      <div v-if="f.type === 'object'" class="nested">
        <FieldList :fields="f.fields" :models="models" />
      </div>
    </div>

    <button class="ghost sm" @click="addField">+ 添加字段</button>
  </div>
</template>
