/* 品牌配置与联系方式 —— 上线前必改 */
export const CONFIG = {
  brand: 'PUPEELE',
  whatsapp: '8613800000000', // 国际格式，不加 + 和空格
  facebook: 'pupee.atelier', // Facebook 主页用户名
  email: 'hello@pupeeatelier.com'
}

export const LINKS = {
  wa: (text = '') =>
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`,
  fb: () => `https://m.me/${CONFIG.facebook}`,
  mail: (subject = '', body = '') =>
    `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
