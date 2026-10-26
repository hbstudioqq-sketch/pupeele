import { onMounted, onUnmounted, nextTick, watch } from 'vue'

/* 滚动渐显。
   注意：依赖 JS 给元素加 .in，若观察器未触发元素会永久停留在 opacity:0，
   所以这里做两层兜底 —— 不支持 IntersectionObserver 时直接显示，
   超时后仍未显示的一律强制显示，避免内容"消失"。

   source（可选）：响应式数据源。传入后每次变化都会重新扫描新增的
   .reveal 元素（如列表筛选后新出现的卡片），保证它们也能被正常渐显。 */
export function useReveal (source, timeout = 2600) {
  let io = null
  let timer = null
  let stop = null

  const show = els => els.forEach(e => e.classList.add('in'))

  const pending = () => [...document.querySelectorAll('.reveal:not(.in)')]

  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /* 扫描当前尚未渐显的元素：能直接显示的直接显示，否则交给观察器 */
  const scan = () => {
    const els = pending()
    if (!els.length) return

    if (reduced() || !io) {
      show(els)
      return
    }

    els.forEach(e => io.observe(e))

    // 兜底：重新计时，超时后强制显示所有仍未渐显的元素
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => show(pending()), timeout)
  }

  onMounted(() => {
    // 用户要求减少动效：直接显示，不做位移
    if (reduced() || !('IntersectionObserver' in window)) {
      show([...document.querySelectorAll('.reveal')])
      return
    }

    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in')
          io.unobserve(en.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' })

    scan()

    if (source) {
      stop = watch(source, () => nextTick(scan))
    }
  })

  onUnmounted(() => {
    if (stop) stop()
    if (io) io.disconnect()
    if (timer) clearTimeout(timer)
  })
}
