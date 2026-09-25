<script setup>
/** 模型列表。 */
defineProps({
  models: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
});
const emit = defineEmits(['select', 'create', 'delete']);
</script>

<template>
  <div class="list card">
    <div class="list-head">
      <h3>公共模型</h3>
      <button class="primary sm" @click="emit('create')">+ 新建</button>
    </div>
    <p v-if="!models.length" class="hint">还没有模型。模型可被多个接口或模型复用。</p>
    <ul>
      <li
        v-for="m in models"
        :key="m.id"
        :class="{ active: m.id === selectedId }"
        @click="emit('select', m.id)"
      >
        <span class="li-main">
          <b>{{ m.name }}</b>
          <code>{{ m.fields.length }} 个字段</code>
        </span>
        <button class="icon danger" title="删除" @click.stop="emit('delete', m)">✕</button>
      </li>
    </ul>
  </div>
</template>
