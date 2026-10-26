<script setup>
import { computed } from 'vue'

/* 品类插画：一套带层次 / 高光 / 投影的参数化 SVG。
   - id      品类图形（dress / wig / shoe / clasp / body / magnet）
   - variant 变体序号，同品类不同产品用，0 / 1 / 2 三套细节
   - tint    [浅, 深] 两色，随品类走 */

let SEQ = 0
const props = defineProps({
  id: { type: String, default: 'dress' },
  variant: { type: Number, default: 0 },
  tint: { type: Array, default: () => ['#f2ece4', '#d9c8b6'] }
})

const uid = `ca${++SEQ}`
const gid = `${uid}-g`
const hid = `${uid}-h`
const v = computed(() => ((props.variant % 3) + 3) % 3)

const LINE = 'rgba(0,0,0,.26)'
const SH = 'rgba(0,0,0,.17)'
const HI = 'rgba(255,255,255,.55)'
</script>

<template>
  <svg class="ca" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient :id="gid" x1="0.1" y1="0" x2="0.55" y2="1">
      <stop :stop-color="tint[0]" />
      <stop :stop-color="tint[1]" />
      </linearGradient>
      <linearGradient :id="hid" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,.85)" />
        <stop offset="1" stop-color="rgba(255,255,255,.08)" />
      </linearGradient>
    </defs>

    <!-- 落影 -->
    <ellipse cx="32" cy="56.5" rx="17" ry="2.8" fill="rgba(0,0,0,.075)" />

    <!-- ══════════ 娃衣 ══════════ -->
    <g v-if="id === 'dress'">
      <!-- 袖 -->
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.25" stroke-linejoin="round" />
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.25" stroke-linejoin="round" />
      <!-- 裙身 -->
      <path
        d="M24.4 14.6h15.2l-1.9 13.2 9.9 18.6c.5 1-.2 2.3-1.4 2.3H17.8c-1.2 0-1.9-1.3-1.4-2.3l9.9-18.6z"
        :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.35" stroke-linejoin="round" />
      <!-- 领口 -->
      <path :stroke="LINE" stroke-width="1.35" stroke-linecap="round" />
      <!-- 腰带 -->
      <rect :fill="SH" />
      <!-- 褶线 -->
      <g :stroke="HI" stroke-width="1.1" stroke-linecap="round" fill="none">
        <path d="M26.6 33.6 22.5 47" /><path d="M32 33.6v13.6" /><path d="M37.4 33.6 41.5 47" />
      </g>
      <!-- 变体 0：针织套装 —— 门襟 + 袖口下摆罗纹 -->
      <g v-if="v === 0">
      <path :stroke="SH" stroke-width="1.2" stroke-linecap="round" />
        <g :stroke="SH" stroke-width="1.05" fill="none" stroke-linecap="round" opacity=".9">
          <path d="M21 45.6c5.8 1.2 16.2 1.2 22 0" />
          <path d="M22 42.8c5.2 1.1 14.6 1.1 20 0" />
          <path d="M18.8 25.2l4.6 2.4" /><path d="M45.2 25.2l-4.6 2.4" />
        </g>
      </g>
      <!-- 变体 1：高定礼服 —— 大蝴蝶结 + 手工缝珠 -->
      <g v-else-if="v === 1">
      <path :fill="SH" />
      <path :fill="SH" />
      <path :fill="SH" />
        <g :fill="HI">
          <circle cx="24.6" cy="40.6" r="1.3" /><circle cx="39.4" cy="40.6" r="1.3" />
          <circle cx="32" cy="46.4" r="1.3" /><circle cx="27" cy="35.4" r="1.1" /><circle cx="37" cy="35.4" r="1.1" />
        </g>
      </g>
      <!-- 变体 2：原创印花 -->
      <g v-else :fill="HI">
        <circle cx="27.2" cy="36.6" r="1.7" /><circle cx="36.8" cy="38.8" r="1.7" />
        <circle cx="31.4" cy="44" r="1.7" /><circle cx="38.6" cy="33" r="1.3" />
        <circle cx="24.6" cy="43" r="1.3" />
      </g>
    </g>

    <!-- ══════════ 假发 ══════════ -->
    <g v-else-if="id === 'wig'">
      <!-- 后发主体：压扁的顶 + 右侧略低，破掉"半圆蘑菇伞"的对称感 -->
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.2" stroke-linejoin="round" />
      <!-- 两侧垂发：下段向内收，像贴着脸颊垂下而不是两根直柱 -->
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" stroke-linejoin="round" />
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" stroke-linejoin="round" />
      <!-- 刘海：下缘带锯齿发梢 -->
      <path :stroke="LINE" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <!-- 发丝分缝：让顶部读作"头发"而不是蘑菇/拱门 -->
      <g :stroke="LINE" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".6">
        <path d="M27.4 26.6c-.7 2.4-.5 4.3.6 5.8" /><path d="M36.6 26.6c.7 2.4.5 4.3-.6 5.8" />
      </g>
      <!-- 发丝高光 -->
      <g :stroke="HI" stroke-width="1.15" fill="none" stroke-linecap="round">
        <path d="M19.2 28.6c2.8-3.1 6.2-4.7 10.2-5.1" /><path d="M44.8 28.6c-2-2.1-4.4-3.5-7.2-4.3" />
        <path d="M24 24.6c2.6-1.4 5.2-2.1 8-2.1" />
      </g>
      <!-- 变体 0：高温丝直发 —— 顺直的发丝 -->
      <g v-if="v === 0" :stroke="HI" stroke-width="1.05" fill="none" stroke-linecap="round" opacity=".85">
        <path d="M17.2 41.5v8.4" /><path d="M20.4 41.5v8" /><path d="M47.4 41.5v8.4" /><path d="M44.2 41.5v8" />
      </g>
      <!-- 变体 1：羊毛卷 —— 发尾成卷 -->
      <g v-else-if="v === 1" :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.05">
        <circle cx="17.4" cy="45.4" r="3.8" /><circle cx="46.6" cy="45.4" r="3.8" />
        <circle cx="21.6" cy="51.4" r="3" /><circle cx="42.4" cy="51.4" r="3" />
        <circle cx="17.9" cy="52.6" r="2.2" /><circle cx="46.1" cy="52.6" r="2.2" />
      </g>
      <!-- 变体 2：渐变挑染 —— 两段粗高光 -->
      <g v-else :stroke="HI" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".9">
        <path d="M21.6 27.6c2.4-2.7 5.1-4.1 8.1-4.3" />
        <path d="M42.4 27.6c-1.8-2-3.9-3.4-6.1-4" />
      </g>
    </g>

    <!-- ══════════ 鞋履 ══════════ -->
    <g v-else-if="id === 'shoe'">
      <!-- 鞋底 -->
      <rect :fill="SH" :stroke="LINE" stroke-width="1.1" />
      <!-- 鞋身：前低后高的侧视轮廓（鞋头低圆 → 鞋背缓升 → 后跟高 → 后沿陡降） -->
      <path
        d="M13.5 46C11.2 41.5 12.2 36.5 16.4 33.4L26 30.6c5-.8 9.5-2.5 13.5-5.2 3.6-1 7.4.4 9.2 3.8l1.4 8.3c.4 5-1.6 8.5-5.6 8.5z"
        :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.25" stroke-linejoin="round" />
      <!-- 鞋口（脚踝开口） -->
      <path :stroke="LINE" stroke-width="1" transform="rotate(-9 36.8 29.8)" />
      <path d="M30.4 28.8c1.9-2.3 4.6-3.5 7.4-3.6" stroke="rgba(255,255,255,.5)" stroke-width="1.3" fill="none" stroke-linecap="round" />
      <!-- 鞋头接缝 -->
      <path :stroke="SH" stroke-width="1.15" fill="none" stroke-linecap="round" />
      <!-- 鞋头高光 -->
      <path :stroke="HI" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <!-- 变体 0：一脚蹬小皮鞋（鞋面横带） -->
      <g v-if="v === 0">
      <path :stroke="SH" stroke-width="2.1" stroke-linecap="round" />
      <path :fill="SH" />
      </g>
      <!-- 变体 1：高帮帆布 + 鞋带 -->
      <g v-else-if="v === 1">
      <path :fill="SH" opacity=".42" />
        <g :stroke="HI" stroke-width="1.4" stroke-linecap="round">
          <path d="M38.4 27.8l4.6 2.4" /><path d="M36.8 31.2l5.4 2.6" />
        </g>
      </g>
      <!-- 变体 2：透明果冻 -->
      <g v-else>
      <path :fill="HI" opacity=".55" />
        <path d="M16.8 36.8c1.6-1.8 3.7-2.7 6-2.8" stroke="rgba(255,255,255,.95)" stroke-width="1.7" fill="none" stroke-linecap="round" />
      </g>
    </g>

    <!-- ══════════ 挂饰 · 包挂 ══════════ -->
    <g v-else-if="id === 'clasp'">
      <!-- 顶环 -->
      <circle :stroke="LINE" stroke-width="2.1" />
      <path :stroke="LINE" stroke-width="1.8" stroke-linecap="round" />
      <!-- 龙虾扣 -->
      <path
        d="M32 17.3c6.7 0 11.2 4.7 11.2 10.8 0 6.7-4.5 12.5-11.2 12.5s-11.2-5.8-11.2-12.5C20.8 22 25.3 17.3 32 17.3z"
        :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.3" />
        <ellipse :fill="`url(#${hid})`" />
        <path :stroke="LINE" stroke-width="1.5" stroke-linecap="round" />
      <!-- 扳手：让它是"龙虾扣"而不是普通圆环 -->
      <path :stroke="LINE" stroke-width="1.9" fill="none" stroke-linecap="round" />
      <!-- 下端连接 -->
      <path :stroke="LINE" stroke-width="1.8" stroke-linecap="round" />
      <!-- 变体 0：圆牌坠 -->
      <g v-if="v === 0">
      <circle :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.2" />
      <circle :fill="HI" />
      </g>
      <!-- 变体 1：珠串 -->
      <g v-else-if="v === 1" :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1">
        <circle cx="32" cy="46.4" r="3" /><circle cx="32" cy="52.2" r="3" />
        <circle cx="26.4" cy="49.3" r="2.4" /><circle cx="37.6" cy="49.3" r="2.4" />
      </g>
      <!-- 变体 2：流苏 -->
      <g v-else>
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" stroke-linejoin="round" />
        <g :stroke="SH" stroke-width="1" stroke-linecap="round">
          <path d="M28.4 48.4v4.2" /><path d="M32 48.4v4.6" /><path d="M35.6 48.4v4.2" />
        </g>
      </g>
    </g>

    <!-- ══════════ 素体 · 五官 ══════════ -->
    <g v-else-if="id === 'body'">
      <!-- 头 -->
      <circle :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.2" />
      <!-- 手臂 -->
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" stroke-linejoin="round" />
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" stroke-linejoin="round" />
      <!-- 躯干 -->
      <path
        d="M24.6 27.6h14.8c1.4 0 2.4 1 2.4 2.4v11.4c0 1.4-1 2.4-2.4 2.4H24.6c-1.4 0-2.4-1-2.4-2.4V30c0-1.4 1-2.4 2.4-2.4z"
        :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.2" />
      <!-- 腿 -->
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" />
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" />
      <!-- 高光 -->
      <path :stroke="HI" stroke-width="1.5" fill="none" stroke-linecap="round" />
      <!-- 变体 0：五官（品类默认，呼应「素体 · 五官」） -->
      <g v-if="v === 0">
      <circle :fill="SH" />
      <circle :fill="SH" />
      <circle :fill="HI" />
      <circle :fill="HI" />
      <path :stroke="SH" stroke-width="1.4" fill="none" stroke-linecap="round" />
        <circle cx="26.6" cy="18.9" r="1.5" fill="rgba(226,142,142,.34)" />
        <circle cx="37.4" cy="18.9" r="1.5" fill="rgba(226,142,142,.34)" />
      </g>
      <!-- 变体 1：素体（关节缝线） -->
      <g v-else-if="v === 1" :stroke="SH" stroke-width="1.1" stroke-dasharray="2 2.2" fill="none">
        <path d="M22.2 30.4h19.6" /><path d="M25.8 43.6h12.4" />
      </g>
      <!-- 变体 2：磁吸接口位 -->
      <g v-else>
      <circle :fill="SH" />
      <circle :fill="HI" />
      <path :stroke="SH" stroke-width="1.2" stroke-linecap="round" />
      </g>
    </g>

    <!-- ══════════ 磁吸接口 ══════════ -->
    <g v-else>
      <!-- U 形磁体：臂宽 6.4 / 内口 17.2，比真实马蹄磁铁更轻盈 -->
      <path
        d="M17 20.4v19.6a15 15 0 0 0 30 0V20.4h-6.4v19.6a8.6 8.6 0 0 1-17.2 0V20.4z"
        :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.25" stroke-linejoin="round" />
      <!-- 两极：都压深，只保留轻微明暗区分，避免看成两件物品 -->
      <rect :fill="SH" :stroke="LINE" stroke-width="1" />
      <rect :fill="tint[1]" :stroke="LINE" stroke-width="1" />
      <path :stroke="HI" stroke-width="1.2" stroke-linecap="round" />
      <!-- 磁力线 -->
      <g :stroke="SH" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-dasharray="2.4 2.6" opacity=".85">
        <path d="M13.2 47.4c5.8 3.6 12.2 5.4 18.8 5.4s13-1.8 18.8-5.4" />
        <path d="M20.4 49.6c4 1.6 7.6 2.4 11.6 2.4s7.6-.8 11.6-2.4" opacity=".5" />
      </g>
      <!-- 变体 0：吸附圆片（悬在磁力线上，强化"吸住"的动作语义） -->
      <g v-if="v === 0">
      <circle :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.2" />
      <circle :fill="HI" />
      <path :stroke="LINE" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.5 1.5" />
      </g>
      <!-- 变体 1：磁片对吸 -->
      <g v-else-if="v === 1">
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" />
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" />
      <path :stroke="SH" stroke-width="1.6" stroke-linecap="round" />
      </g>
      <!-- 变体 2：按扣 -->
      <g v-else>
      <path :fill="`url(#${gid})`" :stroke="LINE" stroke-width="1.1" />
      <circle :fill="SH" />
      <circle :fill="HI" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.ca { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
