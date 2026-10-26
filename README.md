# PUPEELE · Vue 3 + Ant Design Vue

三语（中 / 英 / 法）玩偶配件展示站 + **实时搭配间**。纯前端，无后端，无数据库。

## 快速开始

```bash
cd ~/Desktop/Toys/vue-app
npm install
npm run dev        # 开发，本机 http://localhost:5173 + 局域网自动开放
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物，同样开放局域网
```

## 局域网访问（手机 / 平板 / 其他电脑）

服务已配置 `host: true`（监听 `0.0.0.0`），同一 WiFi 下的设备可以直接打开：

```
http://<本机IP>:5173      # 例如 http://192.168.1.68:5173
```

**查本机 IP**：`ipconfig getifaddr en0`（WiFi）或「系统设置 → 网络 → Wi-Fi → 详细信息」。

也可以直接双击 `~/Desktop/Toys/start-lan.sh`，它会自动探测 IP、打印可复制的访问地址并启动服务。

> 如果其他设备打不开，多半是 macOS 防火墙拦了入站连接：
> 「系统设置 → 隐私与安全性 → 防火墙 → 选项」中允许 `node` 接受传入连接。

路由是 hash 模式（`#/studio`），所以部署到任意静态目录都不会出现刷新 404。

## 品类图标

全部图标在 `src/components/CategoryArt.vue`，是**手写参数化 SVG**（不是图标字体、不是位图）：

```vue
<CategoryArt id="dress" :variant="0" :tint="['#f4ece5', '#e0cec0']" />
```

- `id`：`dress` 娃衣 / `wig` 假发 / `shoe` 鞋履 / `clasp` 挂饰 / `body` 素体五官 / `magnet` 磁吸
- `variant`：`0 / 1 / 2` 三套细节（如娃衣＝门襟罗纹 / 蝴蝶结礼服 / 印花圆点）。
  产品卡按「该产品在所属品类内的序号」自动取变体，所以 19 个产品图各不相同。
- `tint`：`[浅, 深]`，随品类或产品走，改 `catalog.js` 即可整体换色。

**加一个新图标**：在 `CategoryArt.vue` 里加一个 `<g v-else-if="id === 'xxx'">` 分支，
统一用 `viewBox="0 0 64 64"`，主体填 `url(#gid)`、描边用 `LINE`、高光用 `HI`、暗部用 `SH`，
再在 `catalog.js` 的 `CATEGORIES` 里把 `icon` 指向它即可，其余页面自动生效。
渐变 id 由组件内部计数器生成，多个实例同页不会串色。

## 目录结构

```
src/
├─ data/
│  ├─ config.js      品牌与联系方式（上线前必改）
│  ├─ catalog.js     6 个品类 + 19 个产品
│  ├─ taxonomy.js    表单类目（娃娃类型/尺寸/风格/交期）
│  └─ studio3d.js    ★ 搭配间的选项表 + 分享码 + BOM（纯数据，不含 three）
├─ three/
│  ├─ spec.js        ★ 三种素体的比例参数（纯数据，不含 three）
│  ├─ geo.js         几何工具箱：lathe / sph / sweptSheet / bone / taperTube
│  ├─ parts.js       ★ 建模库：素体 / 假发 / 帽饰 / 服装 / 鞋履 / 挂饰
│  ├─ thumb.js       离屏渲染器：把「素体+某部件」渲成选项缩略图
├─ locales/index.js  中 / 英 / 法 三语文案
├─ i18n.js           vue-i18n 实例
├─ stores/           Pinia：lang（语言）· enquiry（询价篮）
├─ components/
│  ├─ CategoryArt.vue  ★ 品类插画图标（6 品类 × 3 变体，参数化 SVG）
│  ├─ Doll3D.vue       ★ 3D 主画面（three.js，可拖拽旋转 / 滚轮缩放）
│  ├─ Thumb3D.vue      3D 缩略图占位与加载态
│  ├─ Swatches.vue     色卡选择器
│  ├─ ProductCard.vue  产品卡
│  └─ SendSheet.vue    询价单弹层（WhatsApp / Facebook / 复制 / 下载）
├─ views/           Home · Collections · Studio · Request · Contact
├─ scripts/         test-parts.mjs（数据层自检）· shoot.mjs（视觉回归截图）· audit.mjs（全站回归）
└─ styles/global.css  Apple 风格全局样式
```

## 五个改动入口

| 想改什么 | 改哪里 |
|---|---|
| 手机号 / Facebook / 邮箱 | `src/data/config.js` 的 `CONFIG` |
| 任何文案 | `src/locales/index.js`（三语各一份，键名一致） |
| 产品与规格 | `src/data/catalog.js` |
| 搭配间的配件款式 | `src/data/studio3d.js` 的选项表 + `src/three/parts.js` 的建模（见下） |
| 品牌主色 / 圆角 | `src/styles/global.css` 顶部的 CSS 变量 |

## 搭配间是怎么实现的

**核心决策：用 three.js 实时程序化建模，不用位图、不用外部 3D 资产。**

没有现成的货品 3D 模型，而位图分层要求"机位绝对一致"，任何一点偏移都会穿帮，且一款配色就要重拍一张图。所以整套素体与配件都是**按比例参数实时生成的几何体**：

- 换配色 = 改材质颜色，零素材成本
- 换尺寸 = 改 `SIZE_SCALE`，不重拍
- 加款式 = 写一个 `buildWig / buildTop / ...` 函数

### 素体比例参数（`src/three/spec.js`）

坐标约定：1 单位 ≈ 1 cm，`y = 0` 是脚底（同时是场景里的站立地面），10 cm 娃总高 10，头高约占 1/3。

三种体型共用一套代码，差异全在参数里：

| | 搪胶 vinyl | 棉花娃娃 cotton | 毛绒挂件 plush |
|---|---|---|---|
| 头 | rx 1.72 / ry 1.68 | 1.78 / 1.74 | 2.05 / 2.00 |
| 肩宽 | 1.34 | 1.32 | 1.22 |
| 腿长比例 | 髋 y=4.22 | 4.12 | 4.36 |

几处踩过坑之后定下来的硬约束（改参数前务必读 `spec.js` 顶部注释）：

- **脚底必须落在 y=0**，且踝球要与脚掌交叠，否则像踩着两个小圆球
- **脖子是外扩喇叭口**，直筒圆柱会让搪胶娃变成人体模特
- **肩线必须是连续曲线**，肩峰处有折角会像穿了件硬壳
- **手臂根点埋进肩峰内侧**，否则肩关节整颗露在外面
- **头下半部收窄 14%**，正球直接当头用会读成「灯泡」，收出下巴才像娃
- **腰线不能太深**（腰 1.19 / 臀 1.25），深了就成了束腰 + 球肚
- **腿根要上移到髋线以下 0.2 以内**，否则大腿根在骨盆侧面顶出一个横向台阶

### 部件建模（`src/three/parts.js`）

8 个槽位：`body / wig / hat / top / bottom / shoes / charm / strap`，
共 3 素体 + 5 五官 + 6 发型 + 5 帽饰 + 5 上装 + 4 下装 + 4 鞋履 + 5 挂饰 + 4 挂绳，全部程序化生成。

**相位约定（最容易踩坑的地方）**：three 的 `SphereGeometry` 与 `LatheGeometry` 对同一个 `phi` 的解释不同

```
球面：  x = -r·cosφ·sinθ,  z =  r·sinφ·sinθ   → φ=90° 才是正脸(+Z)
旋转体：x =  r·sinφ,        z =  r·cosφ        → φ=0°  才是正脸(+Z)
```

所以代码里统一用「方向角 δ」（δ=0 正脸，δ=90° 右侧，δ=180° 后脑）描述部件位置：
球面 `φ = δ + 90°`，旋转体 `φ = δ`。混用这两个几何体时一定要先转成 δ，否则头发会长在脸的另一边。

**头发 = 头皮帽 + 刘海绺 + 侧发绺（三件套）**

早期用「一整片旋转体/球扇区」做头发，两个致命问题：

- 整片壳的下缘是一条硬边 → 读成「扣了顶头盔」
- 壳没有厚度，正面只能看到一条细边 → 读成「两条飘带」

现在拆成三件套，每件只解决一件事：

| 部件 | 作用 | 关键参数 |
|---|---|---|
| `hairCap` | 贴着颅骨的薄壳，负责整体轮廓 | `wrap=252°` 正面留 108° 开口给脸 |
| `hairBangs` | 一绺一绺的刘海，末端圆头 | 9 绺，`spread=56°`，每绺长度不同（中间短两侧长） |
| `hairLocks` | 脸两侧垂下的发绺，正面看有宽度 | 左右各 6~12 绺，半径 0.13~0.26 |

发绺末端必须**快速收细**（末段半径再乘 0.25），否则 `taperTube` 的球形端帽会让发梢变成香肠。
头发材质的 `sheen` / `clearcoat` 也要克制（0.30 / 0.30），拉满会把每绺打成一条亮银色反光条，远看像塑料面条。

**扫掠曲面 `sweptSheet`**：旋转体的包裹角是固定的，做不出「发根盖住头顶、发梢落到肩后」这种上宽下窄的形态。连帽用它生成。
⚠️ `sweptSheet` 的绕序假定「沿 t 上升」，参数写反会让整张壳的法线朝内（头变成一层看不见的内衬）。`hairCap` 必须让 `t` 从下往上走。

**五官烘进贴图**：早期把五官做成独立面片贴在头上，靠 0.4% 的半径差避免 Z 冲突——实测深度缓冲精度不够，面片被头骨吃掉，脸直接消失。现在改成把五官画进头部球体的等距柱状贴图（1024×512），头部用独立带 `map` 的材质，颜色设为白。

### 挂绳与挂饰是一套，不是两件独立的饰品

产品语义上，「挂饰」是**包挂**（龙虾扣挂件 / 造型星 / 珠串 / 造型心），
「挂绳」是**斜挎挂绳**（珠链 / 皮质 / 缎带蝴蝶结）——两者是配套的：

```
挂绳：从左肩斜挎过胸前 → 右髋外侧 → 末端垂下
挂饰：吊在挂绳末端
```

所以代码里有一个共用锚点 `strapAnchor()`，挂绳和挂饰都挂在它上面：

```js
function strapAnchor (spec) {
  return [1.62, 3.66, 0.50]   // 必须在身体轮廓之外
}
```

锚点如果落在腰/髋半宽以内，挂饰会被裙子或大腿整个吞掉（渲染时完全看不见）。
同理，裙子下摆不能太宽——`hip.half * 2.25` 的长裙直径比肩宽还大一倍，会变成帐篷。

缎带用的是 `taperBand()`（椭圆截面的扁带），不是 `taperTube()` 的圆截面，
并且两端要补半球封口，否则端头是敞口圆管，近看会露出内壁。

### 加一个新配件（以"新裙型"为例）

在 `src/data/studio3d.js` 的 `BOTTOMS` 数组里加一项：

```js
{
  id: 'tutu',
  name: { zh: '蓬蓬裙', en: 'Tutu skirt', fr: 'Jupe tutu' },
  sku: 'o2'                       // 关联到 catalog.js 里的真实 SKU，会进 BOM
}
```

然后在 `src/three/parts.js` 的 `buildBottom` 里加一个 `case 'tutu':` 分支，
用 `torsoShell / taperTube / lathe` 等工具拼出裙身。

选项卡、3D 缩略图、实时预览、BOM 清单、询价文本全部自动生效。

### 分享与还原

搭配状态会被编码进 URL（`?#/studio?look=xxxx`），复制链接即可还原整套搭配，也可以直接发给供应商。
编码表在 `studio3d.js` 的 `encodeLook / decodeLook`。

> 分享码用 **base64url**（`+`→`-`，`/`→`_`）。标准 base64 的 `+` 放在 URL 里会被解码成空格，
> 链接分享出去就会悄悄丢参数。解码端同时兼容旧字符，老链接不会失效。
>
> 还原走 `watch(() => route.query.look)` 而不是只在 `onMounted` 读一次——
> 同一页面里从链接 A 切到链接 B 时组件不会重新挂载，只读 onMounted 会让链接看起来"没生效"。

### 自检与视觉回归

```bash
# 数据层自检：穷举「素体 × 品类 × 选项」，查 NaN / 法线朝向 / 落地基准 / 包围盒
node_modules/.bin/esbuild scripts/test-parts.mjs --bundle --platform=node --format=esm \
  --packages=external --alias:@=./src --outfile=.tmp/tp.mjs && node .tmp/tp.mjs

# 视觉回归：跑真实页面 + 本机 Chrome，按 19 组搭配批量截图到 .tmp/shots/
node scripts/shoot.mjs
# 只拍指定组合（快速迭代用）
node scripts/shoot.mjs http://localhost:4173 .tmp/shots2 01-bare,02-longhair

# 全站回归：移动端 390×844 适配 + 四页面 + BOM + 分享码还原 + 询价篮
node scripts/audit.mjs
```

数据层自检目前 **687 项断言全通过**；`audit.mjs` 覆盖 5 组共 20 余项站点级断言。建模类改动请先跑它——肉眼很难发现法线朝内、NaN 顶点这类问题。

### 性能

three 独立成 chunk 按需加载，首屏主包 858 KB（gzip 266 KB），
3D 模块 564 KB（gzip 143 KB）只在进入搭配间时拉取。

`src/three/spec.js` 与 `src/data/studio3d.js` 都**不 import three**，
否则选项表会把整个 3D 引擎拖进首屏主包。

## 已知限制

- 产品图是 AI 生成的概念图，不是真实货品，上架前必须换实拍（放在 `public/img/`）
- 3D 预览是**程序化生成的示意模型**，用于确认比例、色彩关系与层次，不替代实物打样；缝线、面料垂坠、蕾丝花纹等细节需以实物为准
- 预览图仅供沟通款式方向，导出 PNG 时注意去掉品牌信息后再对外使用
- 留言链路走 WhatsApp / Facebook 深链，无后端；Messenger 不支持预填文本，改为打开主页同时把文本复制到剪贴板
- 询价篮存在内存里，刷新会清空（如需持久化，把 `stores/enquiry.js` 接上 localStorage 即可）
- 3D 搭配间是示意模型，**挂饰与斜挎挂绳的组合**目前只支持绳尾挂饰，尚未做「包体 + 挂饰」的完整挂包形态
