/* 品类 + 产品目录（与静态站数据一致） */
export const CATEGORIES = [
  { id: 'outfits', icon: 'dress', tint: ['#f4ece5', '#e0cec0'], nameKey: 'cat.outfits' },
  { id: 'heads', icon: 'wig', tint: ['#efe9f0', '#d3c7d8'], nameKey: 'cat.heads' },
  { id: 'shoes', icon: 'shoe', tint: ['#eae9ec', '#cbc8d2'], nameKey: 'cat.shoes' },
  { id: 'charms', icon: 'clasp', tint: ['#f2ece2', '#dbcfba'], nameKey: 'cat.charms' },
  { id: 'bodies', icon: 'body', tint: ['#eceef1', '#cdd3dc'], nameKey: 'cat.bodies' },
  { id: 'magnetic', icon: 'magnet', tint: ['#eceae6', '#cfcdc6'], nameKey: 'cat.magnetic' }
]

export const PRODUCTS = [
  /* 娃衣 */
  { id: 'o1', cat: 'outfits', tint: ['#f6efe8', '#e2d0c0'],
    nameKey: 'p.o1.name',
    descKey: 'p.o1.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.o1.mat', moq: 300, price: '$1.60 – $2.40', leadKey: 'p.o1.lead' },
  { id: 'o2', cat: 'outfits', tint: ['#f2e6ec', '#d6bccb'],
    nameKey: 'p.o2.name',
    descKey: 'p.o2.desc',
    size: '10 / 15 cm', matKey: 'p.o2.mat', moq: 200, price: '$4.80 – $7.60', leadKey: 'p.o2.lead' },
  { id: 'o3', cat: 'outfits', tint: ['#eeeef4', '#c8c9dc'],
    nameKey: 'p.o3.name',
    descKey: 'p.o3.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.o3.mat', moq: 300, price: '$2.20 – $3.40', leadKey: 'p.o3.lead' },
  { id: 'o4', cat: 'outfits', tint: ['#e9ecea', '#c4cdc8'],
    nameKey: 'p.o4.name',
    descKey: 'p.o4.desc',
    size: '10 / 15 cm', matKey: 'p.o4.mat', moq: 300, price: '$3.60 – $5.20', leadKey: 'p.o4.lead' },

  /* 头部（脸 + 发一体成型） */
  { id: 'h1', cat: 'heads', tint: ['#f1ecef', '#d4c6d2'],
    nameKey: 'p.h1.name',
    descKey: 'p.h1.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.h1.mat', moq: 300, price: '$2.40 – $3.80', leadKey: 'p.h1.lead' },
  { id: 'h2', cat: 'heads', tint: ['#f3eee6', '#dccdb8'],
    nameKey: 'p.h2.name',
    descKey: 'p.h2.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.h2.mat', moq: 300, price: '$2.40 – $3.80', leadKey: 'p.h2.lead' },
  { id: 'h3', cat: 'heads', tint: ['#eeeaf2', '#cbc2de'],
    nameKey: 'p.h3.name',
    descKey: 'p.h3.desc',
    size: '10 / 15 cm', matKey: 'p.h3.mat', moq: 300, price: '$2.60 – $4.10', leadKey: 'p.h3.lead' },
  { id: 'h4', cat: 'heads', tint: ['#f0eef4', '#d0cbe0'],
    nameKey: 'p.h4.name',
    descKey: 'p.h4.desc',
    size: '10 / 15 cm', matKey: 'p.h4.mat', moq: 300, price: '$2.60 – $4.10', leadKey: 'p.h4.lead' },
  { id: 'h5', cat: 'heads', tint: ['#eceff3', '#cfd6e0'],
    nameKey: 'p.h5.name',
    descKey: 'p.h5.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.h5.mat', moq: 300, price: '$2.40 – $3.80', leadKey: 'p.h5.lead' },
  { id: 'h6', cat: 'heads', tint: ['#f0eee9', '#d4cec2'],
    nameKey: 'p.h6.name',
    descKey: 'p.h6.desc',
    size: '6 / 10 / 15 cm', matKey: 'p.h6.mat', moq: 300, price: '$2.00 – $3.20', leadKey: 'p.h6.lead' },

  /* 鞋履 */
  { id: 's1', cat: 'shoes', tint: ['#eeecea', '#cfcac4'],
    nameKey: 'p.s1.name',
    descKey: 'p.s1.desc',
    size: '6 / 10 cm', matKey: 'p.s1.mat', moq: 500, price: '$0.60 – $1.10', leadKey: 'p.s1.lead' },
  { id: 's2', cat: 'shoes', tint: ['#e9ebee', '#c6ccd6'],
    nameKey: 'p.s2.name',
    descKey: 'p.s2.desc',
    size: '10 / 15 cm', matKey: 'p.s2.mat', moq: 500, price: '$1.10 – $1.80', leadKey: 'p.s2.lead' },
  { id: 's3', cat: 'shoes', tint: ['#eef0f1', '#c9d2d4'],
    nameKey: 'p.s3.name',
    descKey: 'p.s3.desc',
    size: '6 / 10 cm', matKey: 'p.s3.mat', moq: 500, price: '$0.90 – $1.50', leadKey: 'p.s3.lead' },

  /* 挂饰 */
  { id: 'c1', cat: 'charms', tint: ['#f2ece2', '#dbcfba'],
    nameKey: 'p.c1.name',
    descKey: 'p.c1.desc',
    size: '通用', matKey: 'p.c1.mat', moq: 1000, price: '$0.12 – $0.28', leadKey: 'p.c1.lead' },
  { id: 'c2', cat: 'charms', tint: ['#f4ebe6', '#dfc8bb'],
    nameKey: 'p.c2.name',
    descKey: 'p.c2.desc',
    size: '通用', matKey: 'p.c2.mat', moq: 500, price: '$0.45 – $0.95', leadKey: 'p.c2.lead' },
  { id: 'c3', cat: 'charms', tint: ['#f0eef4', '#d0cbe0'],
    nameKey: 'p.c3.name',
    descKey: 'p.c3.desc',
    size: '通用', matKey: 'p.c3.mat', moq: 300, price: '$0.80 – $1.60', leadKey: 'p.c3.lead' },

  /* 素体五官 */
  { id: 'b1', cat: 'bodies', tint: ['#eceef1', '#ced5de'],
    nameKey: 'p.b1.name',
    descKey: 'p.b1.desc',
    size: '6 cm', matKey: 'p.b1.mat', moq: 500, price: '$1.20 – $2.10', leadKey: 'p.b1.lead' },
  { id: 'b2', cat: 'bodies', tint: ['#eaedf0', '#c8d0da'],
    nameKey: 'p.b2.name',
    descKey: 'p.b2.desc',
    size: '15 cm', matKey: 'p.b2.mat', moq: 300, price: '$3.20 – $5.40', leadKey: 'p.b2.lead' },
  { id: 'b3', cat: 'bodies', tint: ['#f0eee9', '#d4cec2'],
    nameKey: 'p.b3.name',
    descKey: 'p.b3.desc',
    size: '6 / 10 cm', matKey: 'p.b3.mat', moq: 500, price: '$0.50 – $0.95', leadKey: 'p.b3.lead' },

  /* 磁吸接口 */
  { id: 'm1', cat: 'magnetic', tint: ['#e9ecea', '#c7d2cb'],
    nameKey: 'p.m1.name',
    descKey: 'p.m1.desc',
    size: '通用', matKey: 'p.m1.mat', moq: 1000, price: '$0.28 – $0.55', leadKey: 'p.m1.lead' },
  { id: 'm2', cat: 'magnetic', tint: ['#eaeee9', '#c9d4ca'],
    nameKey: 'p.m2.name',
    descKey: 'p.m2.desc',
    size: '6 / 10 cm', matKey: 'p.m2.mat', moq: 1000, price: '$0.22 – $0.42', leadKey: 'p.m2.lead' },
  { id: 'm3', cat: 'magnetic', tint: ['#e8eceb', '#c6d0d0'],
    nameKey: 'p.m3.name',
    descKey: 'p.m3.desc',
    size: '10 / 15 cm', matKey: 'p.m3.mat', moq: 500, price: '$0.55 – $1.05', leadKey: 'p.m3.lead' }
]

export const STATS = [
  { value: '300', key: 'stats.moq', suffix: '' },
  { value: '2,400', key: 'stats.sku', suffix: '+' },
  { value: '3', key: 'stats.lead', suffixKey: 'stat.stats.lead.suffix' },
  { value: 'EN71', key: 'stats.cert', suffix: '' }
]
