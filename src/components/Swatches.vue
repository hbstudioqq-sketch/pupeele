<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  colors: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="swatches">
    <button
      v-for="c in props.colors"
      :key="c"
      class="sw"
      :class="{ on: props.modelValue === c }"
      :style="{ background: c }"
      :title="c"
      @click="emit('update:modelValue', c)"
    />
  </div>
</template>

<style scoped>
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.sw {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--line);
  cursor: pointer;
  padding: 0;
  transition: transform .22s var(--ease), box-shadow .22s var(--ease);
}
.sw:hover { transform: scale(1.1); }
.sw.on { box-shadow: 0 0 0 2px var(--ink); transform: scale(1.06); }
</style>
