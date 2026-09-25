<script setup>
/** 条件场景编辑：场景顺序即匹配优先级，支持上移/下移调整。 */
import FieldList from './FieldList.vue';

const props = defineProps({
  scenarios: { type: Array, required: true },
  models: { type: Array, default: () => [] },
});

function add() {
  props.scenarios.push({
    name: `场景 ${props.scenarios.length + 1}`,
    conditions: [],
    fields: [],
  });
}

function move(i, d) {
  const j = i + d;
  if (j < 0 || j >= props.scenarios.length) return;
  const [s] = props.scenarios.splice(i, 1);
  props.scenarios.splice(j, 0, s);
}

function remove(i) {
  props.scenarios.splice(i, 1);
}

function addCondition(s) {
  s.conditions.push({ source: 'query', key: '', op: 'eq', value: '' });
}

function removeCondition(s, j) {
  s.conditions.splice(j, 1);
}
</script>

<template>
  <div class="scenario-list">
    <p class="hint">场景按声明顺序依次匹配，命中的第一套生效；都不命中时走默认响应。可用 ↑ ↓ 调整优先级。</p>
    <div v-for="(s, i) in scenarios" :key="i" class="scenario card-inset">
      <div class="scenario-head">
        <span class="badge">优先级 {{ i + 1 }}</span>
        <input v-model="s.name" class="grow" placeholder="场景名称，如：空列表 / 鉴权失败" />
        <button class="icon" title="上移" :disabled="i === 0" @click="move(i, -1)">↑</button>
        <button class="icon" title="下移" :disabled="i === scenarios.length - 1" @click="move(i, 1)">↓</button>
        <button class="icon danger" title="删除场景" @click="remove(i)">✕</button>
      </div>

      <div class="cond-block">
        <div class="block-title">匹配条件（全部满足才命中）</div>
        <div v-for="(c, j) in s.conditions" :key="j" class="cond-line">
          <select v-model="c.source">
            <option value="query">查询参数</option>
            <option value="header">请求头</option>
          </select>
          <input v-model="c.key" placeholder="键，如 token" />
          <select v-model="c.op">
            <option value="eq">等于</option>
            <option value="exists">存在</option>
          </select>
          <input v-if="c.op === 'eq'" v-model="c.value" placeholder="比较值" />
          <button class="icon danger" @click="removeCondition(s, j)">✕</button>
        </div>
        <button class="ghost sm" @click="addCondition(s)">+ 添加条件</button>
      </div>

      <div class="block-title">该场景的响应结构</div>
      <FieldList :fields="s.fields" :models="models" />
    </div>
    <button class="ghost" @click="add">+ 添加场景</button>
  </div>
</template>
