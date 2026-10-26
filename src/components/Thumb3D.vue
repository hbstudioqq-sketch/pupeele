<script setup>
import { computed, reactive } from 'vue'

const props = defineProps({
  src: { type: String, default: '' }
})
const has = computed(() => !!props.src)
</script>

<template>
  <span class="thumb3d" :class="{ empty: !has }">
    <img v-if="has" :src="src" alt="" draggable="false" />
    <span v-else class="skeleton" />
  </span>
</template>

<style scoped>
.thumb3d {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
}
.thumb3d img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  animation: fade .45s var(--ease);
}
.skeleton {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background: linear-gradient(120deg, rgba(0,0,0,.03), rgba(0,0,0,.07), rgba(0,0,0,.03));
  background-size: 220% 100%;
  animation: sweep 1.5s linear infinite;
}
@keyframes fade { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
@keyframes sweep { from { background-position: 120% 0; } to { background-position: -120% 0; } }
</style>
