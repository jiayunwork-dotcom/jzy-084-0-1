<script setup>
/** 接口列表。 */
defineProps({
  apis: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
});
const emit = defineEmits(['select', 'create', 'delete']);
</script>

<template>
  <div class="list card">
    <div class="list-head">
      <h3>接口</h3>
      <button class="primary sm" @click="emit('create')">+ 新建</button>
    </div>
    <p v-if="!apis.length" class="hint">还没有接口，点击「新建」开始定义。</p>
    <ul>
      <li
        v-for="a in apis"
        :key="a.id"
        :class="{ active: a.id === selectedId }"
        @click="emit('select', a.id)"
      >
        <span class="method" :data-m="a.method">{{ a.method }}</span>
        <span class="li-main">
          <b>{{ a.name }}</b>
          <code>{{ a.path }}</code>
        </span>
        <button class="icon danger" title="删除" @click.stop="emit('delete', a)">✕</button>
      </li>
    </ul>
  </div>
</template>
