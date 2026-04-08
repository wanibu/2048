# Giant 2048 项目分析文档

## 一、项目概述

这是一个 **Giant 2048** 网页小游戏项目，基于 **Construct 3** 游戏引擎构建，集成了 Google GameSnacks 和 Famobi 平台 SDK，面向 H5 游戏分发平台。

游戏文件来源：从 `https://mini-game.pwtk.cc/game/1988901048489435138/index.html` 下载的运行时导出文件（非 `.c3p` 源项目）。

---

## 二、项目结构

```
2048/
├── .gitignore                          # macOS 相关忽略规则
├── giant2048_game.zip                  # 游戏压缩包 (~11.7MB)
├── ANALYSIS.md                         # 本文档
└── game/1988901048489435138/
    ├── index.html                      # 入口页面
    ├── data.json                       # 游戏数据配置（~77K tokens，Construct 3 序列化事件表）
    ├── appmanifest.json                # PWA manifest
    ├── famobi.json                     # Famobi/GameSnacks 平台配置
    ├── style.css                       # 页面样式（黑色背景，禁用触摸滚动）
    ├── gamesnacks.js                   # Google GameSnacks SDK
    ├── custom.js                       # Famobi API / GameSnacks 适配层（含本地 stub）
    ├── common.js                       # 空文件占位
    ├── dummy.js                        # 空文件占位
    ├── scripts/
    │   ├── supportcheck.js             # 浏览器兼容性检测（WebGL/WASM/ES Modules）
    │   ├── main.js                     # 运行时入口（RuntimeInterface 定义与初始化）
    │   ├── c3runtime.js                # Construct 3 运行时引擎（解析并执行 data.json）
    │   ├── dispatchworker.js           # Worker 任务调度
    │   ├── jobworker.js                # Worker 执行器
    │   ├── register-sw.js              # Service Worker 注册
    │   ├── opus.wasm.js / opus.wasm.wasm  # Opus 音频解码器
    │   └── project/
    │       ├── Script.js               # 自定义脚本入口（当前基本为空，只有空 Tick）
    │       └── scriptsInEvents.js      # 事件中嵌入的 JS（仅 confetti 纸屑特效）
    ├── images/                         # 游戏图片素材
    │   ├── shape-sheet0.png            # 数字方块精灵图（14帧）
    │   ├── border-sheet0.png           # 网格边框精灵图（15帧）
    │   ├── mergeeffect-sheet0/1/2.png  # 合并特效
    │   ├── borderexplodeanimation-sheet0/1/2.png  # 边框爆炸特效
    │   ├── shared-0-sheet0/1/2/3/4.png # 共享素材（网格、UI等）
    │   ├── girl-sheet0.png             # 角色形象
    │   ├── playbackground-sheet0.png   # 游戏背景
    │   ├── popupbackground-sheet0.png  # 弹窗背景
    │   ├── loaderbar-sheet0.png        # 加载条
    │   └── ...
    ├── media/                          # 音效文件（.webm 格式）
    │   ├── slingshot1/2/3.webm         # 弹弓发射音效
    │   ├── firsthit.webm              # 碰撞音效
    │   ├── candycollapse1/2.webm      # 合并音效
    │   ├── candycrunch1/2.webm        # 消除音效
    │   ├── cuberotation.webm          # 网格旋转音效
    │   ├── concretesup.webm           # 石头生成音效
    │   ├── concretedestroy.webm       # 石头消除音效
    │   ├── combo.webm                 # 连击音效
    │   ├── wow.webm                   # 惊叹音效
    │   ├── buttonfinal.webm           # 按钮音效
    │   ├── endoflevel.webm            # 关卡结束音效
    │   ├── gameresultwin.webm         # 胜利音效
    │   └── giantost2.webm             # 背景音乐
    ├── icons/                          # 应用图标（16/32/114/128/256px）
    └── html5games/                     # Famobi 游戏平台 API
        ├── gameapi/
        │   ├── v1.js                   # Famobi API v1
        │   ├── v1/play.css             # 平台样式
        │   ├── famobi_analytics_v1.js  # 数据分析
        │   ├── detection.js            # 设备检测
        │   └── zepto.min.js            # 轻量 jQuery 替代库
        └── images/
            ├── icon.svg                # 平台图标
            └── leaderboard2.svg        # 排行榜图标
```

---

## 三、代码架构分析

### 各文件角色

| 文件 | 角色 |
|------|------|
| `data.json` (77K tokens) | **全部游戏逻辑** — Construct 3 事件表的序列化数据 |
| `scripts/c3runtime.js` | Construct 3 引擎，解析并执行 data.json |
| `scripts/main.js` | 运行时入口，定义 RuntimeInterface、DOMHandler 等框架类 |
| `scripts/supportcheck.js` | 浏览器兼容性检查，设置 `C3_IsSupported` 标志 |
| `scripts/project/Script.js` | 自定义脚本入口，当前基本为空（只有空的 Tick） |
| `scripts/project/scriptsInEvents.js` | 事件中嵌入的 JS — 只有 confetti 纸屑特效 |
| `custom.js` | Famobi/GameSnacks 平台 SDK 适配层 |
| `gamesnacks.js` | Google GameSnacks SDK 本体 |

### 游戏对象一览

| 对象名 | 索引 | 实例变量 | 行为(Behaviors) | 说明 |
|--------|------|----------|-----------------|------|
| Shape | 0 | Number, CoinUID, SlingShape, balloonMark | Bullet, Fade, Pin, Tween | 数字方块（14帧动画） |
| Border | 1 | Number, CoinUID, mLeftBorder, mRightBorder, mUpBorder, MergeResult, NextBorderBlock | Fade, Bullet, Pin, Tween | 网格中的方块（15帧动画） |
| Function | 2 | - | - | C3 函数调用 |
| Collider | 3 | - | - | 碰撞检测器 |
| arrBM | 4 | - | - | 棋盘/合并数组 |
| Touch | 5 | - | - | 触摸输入 |
| Grid | 6 | - | - | 5×5 游戏网格 |
| Audio | 7 | - | - | 音频管理 |
| Browser | 8 | - | - | 浏览器接口 |
| DisplayShape | 9 | - | Fade | 预览方块显示层 |
| Giant | 10 | - | Tween | 标题/角色 |
| Sling | 15 | Offset | - | 弹弓发射器 |
| RotateArrow | 14 | type | - | 旋转箭头按钮 |
| MergeEffect | 16 | - | Pin | 合并特效 |
| SelectedLineO | 19 | - | Fade | 选中列指示线 |
| BorderExplodeAnimation | 20 | ShapeNumber | Fade | 边框爆炸动画 |
| CoinPlay | 21 | Fly | Pin, Tween | 金币动画 |
| Keyboard | 22 | - | - | 键盘输入 |
| TutorialHand | 48 | HoldPosition, TutorialState | Tween, Pin, Fade | 教程引导手 |
| StoneDestroy | 49 | - | - | 石头消除 |
| ComboSprite | 51 | - | Tween | 连击文字 |
| WowSprite | 52 | - | Tween | 惊叹特效 |
| SaveData | 42 | dataLoaded | - | 存档管理 |
| LocalStorage | 43 | - | - | 本地存储 |
| FamobiAPI | 55 | - | - | 平台 API |

### 全局变量

| 变量名 | 初始值 | 用途 |
|--------|--------|------|
| Columns | 5 | 网格列数 |
| Rows | 5 | 网格行数 |
| CellSize | 93.5 | 每格像素大小 |
| pixelOffsetX | 86.25 | 网格 X 偏移 |
| GameScore | 0 | 当前分数 |
| TopScore | 0 | 历史最高分 |
| OldTopScore | 0 | 上一次最高分 |
| SpawnNumber | 5 | 可生成的数字范围上限 |
| NextNumberBlock | 0 | 下一个发射的方块数字 |
| MaxNumberAchieved | 9 | 当前最大合成数字 |
| MaxNumberAchievedUID | 0 | 最大数字方块的 UID |
| MergeCount | 0 | 当前连续合并次数 |
| MergeTimer | 0.4 | 合并计时器 |
| TimeBetweenMerges | 0.4 | 合并间隔（秒） |
| NewMergedNumber | 1 | 最新合成的数字 |
| PriorityLargestMergeCount | 0 | 合并优先级计数 |
| PriorityBorderUID | 0 | 优先合并目标 UID |
| GameTurnCounter | 0 | 回合计数器 |
| EdgeBorderCount | 0 | 边缘方块计数 |
| ShootAvailable | 0 | 是否可发射 |
| SlingTouch | 0 | 弹弓触控状态 |
| SlingKeyPress | 0 | 弹弓键盘状态 |
| SelectedLineX | 0 | 选中列 X 坐标 |
| LineWasClickedBool | 0 | 列是否已选中 |
| Sound | 1 | 音效开关 |
| FirstGameOfLife | 1 | 是否首次游戏 |
| FirstGameOfPlay | 1 | 是否首次开局 |
| AngleStep | 0 | 旋转角度步进 |
| RotationIterator | 0 | 旋转动画迭代器 |
| ShowedAdBool | False | 是否已显示广告 |
| StoneCreating | False | 是否正在生成石头 |
| DisplayScore | 0 | 显示分数（动画用） |
| scoreIndex | 0 | 分数索引 |
| CoinNumberGameR | 0 | 结算金币数 |
| ShowingComboText | 0 | 是否正在显示连击文字 |
| LayoutBeginY | 0 | 布局起始 Y |
| PlayTouchYBottom | 0 | 触摸底部 Y |
| numeroDeShape | 1 | 形状编号 |

### 事件表结构

| 事件表 | 子项数 | 说明 |
|--------|--------|------|
| GameSheet | 64 | 核心游戏逻辑（变量 + 事件组 + 函数） |
| MenuSheet | 8 | 菜单界面 |
| LoaderSheet | 8 | 加载界面 |
| FamobiAPISheet | 6 | 平台 API 事件 |

### GameSheet 核心函数模块

| 函数 | 索引 | 默认状态 | 事件数 | 职责 |
|------|------|----------|--------|------|
| Merge Phase | 38 | OFF（动态激活） | 3 | 相同数字方块合并逻辑 |
| Rotating Grid | 45 | ON | 1 | 网格旋转控制 |
| Rotation Action | 47 | OFF（动态激活） | 1 | 旋转操作执行 |
| Shapes Shooting | 49 | ON | 8 | 弹弓发射方块（触屏 + 键盘） |
| Animation | 50 | ON | 22 | 合并动画、爆炸特效 |
| UI | 52 | ON | 15 | 界面更新、分数显示 |
| Objects Positions | 56 | ON | 6 | 对象位置计算 |
| Tutorial | 57 | ON | 2 | 新手引导 |
| Stone spawning | 59 | ON | 2 | 石头障碍物生成 |
| Saving Data | 60 | ON | 1 | LocalStorage 存档 |
| Famobi API | 61 | ON | 8 | 平台 API 调用 |

### 布局(Layout)结构

| 布局名 | 尺寸 | 事件表 | 图层 |
|--------|------|--------|------|
| Game | 640×960 | GameSheet | Play → Animation → HUD → Popup → SoundButtonLayer |
| Menu | 640×960 | MenuSheet | Layer 0 |
| Loader | 640×960 | LoaderSheet | Layer 0 |

---

## 四、项目加载流程

```
浏览器打开 index.html
│
├─ 1. 加载 style.css（页面基础样式，黑色背景，禁用触摸滚动）
│
├─ 2. 执行 supportcheck.js
│     └─ 检测 WebGL / WebAssembly / ES Modules
│     └─ 通过 → 设置 window.C3_IsSupported = true
│     └─ 不通过 → 显示 "Software update needed" 错误页
│
├─ 3. 执行 custom.js
│     └─ 初始化 window.famobi（平台 API stub）
│     └─ 初始化 window.GAMESNACKS（SDK stub）
│     └─ 注册分数上报、广告回调等适配函数
│
├─ 4. 加载 main.js (type="module")
│     │
│     ├─ 4a. 定义 DOMHandler / DOMElementHandler 基类
│     │      （DOM 层与运行时之间的消息通信框架）
│     │
│     ├─ 4b. 定义 RuntimeInterface 类
│     │      （核心调度器：管理 Canvas、Worker、消息通道）
│     │
│     ├─ 4c. 注册各 DOMHandler 子类
│     │      ├─ RuntimeDOMHandler（窗口事件、指针、键盘、全屏）
│     │      ├─ TouchDOMHandler（设备方向权限）
│     │      ├─ AudioDOMHandler（音频上下文、播放管理）
│     │      └─ JobSchedulerDOM（Web Worker 任务调度）
│     │
│     └─ 4d. 实例化 RuntimeInterface（main.js:112）
│            if (C3_IsSupported) {
│              new RuntimeInterface({
│                useWorker: false,        ← DOM 模式，不用 Worker
│                engineScripts: ["scripts/c3runtime.js"],
│                projectScripts: ["Script.js", "scriptsInEvents.js"],
│                exportType: "html5"
│              })
│            }
│            │
│            └─ 5. RuntimeInterface._Init()
│                  │
│                  ├─ 计算 baseUrl（当前页面路径）
│                  ├─ 创建 MessageChannel（DOM ↔ Runtime 通信）
│                  ├─ 初始化 JobScheduler（创建 DispatchWorker + JobWorker）
│                  │
│                  └─ 6. RuntimeInterface._InitDOM()
│                        │
│                        ├─ 创建 <canvas>（隐藏状态）→ 挂到 body
│                        ├─ 实例化所有 DOMHandler
│                        │
│                        ├─ 动态加载引擎脚本：
│                        │   └─ <script src="scripts/c3runtime.js">
│                        │
│                        ├─ 动态加载项目脚本：
│                        │   ├─ <script src="scripts/project/Script.js">
│                        │   │    └─ runOnStartup() 注册 beforeprojectstart 监听
│                        │   └─ <script src="scripts/project/scriptsInEvents.js">
│                        │        └─ 注册 confetti 特效函数
│                        │
│                        └─ 7. 创建并初始化 C3 Runtime
│                              │
│                              ├─ C3_CreateRuntime(opts) → new C3.Runtime()
│                              └─ C3_InitRuntime() → runtime.Init(opts)
│                                    │
│                                    ├─ 8. fetch("data.json")
│                                    │     └─ 解析 77K tokens 的游戏数据
│                                    │
│                                    ├─ 9. _LoadDataJson(data)
│                                    │     ├─ 读取项目元信息（名称、尺寸 640×960）
│                                    │     ├─ 创建插件（projectData[2]）
│                                    │     ├─ 创建对象类型（projectData[3]）
│                                    │     │   ├─ Shape, Grid, Sling, Border...
│                                    │     │   └─ FamobiAPI ← 调用 famobi.onRequest()
│                                    │     ├─ 创建布局 Layout（projectData[5]）
│                                    │     │   └─ "Game" 布局 640×960，含 "Play" 层
│                                    │     ├─ 创建事件表（projectData[6]）
│                                    │     │   ├─ GameSheet（核心玩法 64 项）
│                                    │     │   ├─ MenuSheet
│                                    │     │   ├─ LoaderSheet
│                                    │     │   └─ FamobiAPISheet
│                                    │     └─ 初始化全局变量
│                                    │         （GameScore, Columns=5, Rows=5 等）
│                                    │
│                                    ├─ 10. InitialiseCanvas
│                                    │      └─ 初始化 WebGL 渲染器
│                                    │      └─ 启动 Loading Screen
│                                    │
│                                    ├─ 11. 加载资源
│                                    │      ├─ images/*.png（方块、网格、特效贴图）
│                                    │      ├─ media/*.webm（音效文件）
│                                    │      └─ 可能加载 opus.wasm（音频解码）
│                                    │
│                                    ├─ 12. EndLoadingScreen
│                                    │      └─ Canvas 从 display:none → 可见
│                                    │
│                                    └─ 13. runtime.Start()
│                                           ├─ 触发 "beforeprojectstart" 事件
│                                           │   └─ Script.js 注册 Tick 回调
│                                           ├─ 执行 "On start of layout" 事件
│                                           └─ 开始游戏主循环（requestAnimationFrame）
│                                                └─ 每帧：事件表求值 → 渲染 Canvas
```

### 关于 Canvas 渲染

Construct 3 引擎的所有游戏内容（方块、网格、UI、文字、按钮）都渲染在单个 `<canvas>` 元素上，不是 DOM 元素。Canvas 在步骤 6 中创建并插入 `<body>`，步骤 12 加载完成后才显示出来。

---

## 五、核心玩法详解

### 1. 游戏场景

- 640×960 的竖屏画面
- 5×5 网格（`Columns=5, Rows=5`），每格 93.5px
- 画面分 5 层：Play（主游戏）→ Animation（特效）→ HUD（分数UI）→ Popup（弹窗）→ SoundButton

### 2. 发射方块（Shapes Shooting）

玩家通过**弹弓（Sling）** 向网格中发射数字方块：

- **触屏操作**：触摸弹弓 → 拖动瞄准 → 松手发射（`Touch` 事件检测）
- **键盘操作**：左右方向键（keycode 37/39）选择列，空格键/回车键（keycode 32/17/90）发射
- 发射时 Shape 获得 `Bullet` 行为（物理弹道），撞到 Border 后 `Pin` 固定
- 发射前在弹弓旁显示 `DisplayShape` 预览下一个方块
- 发射音效：`slingshot1/2/3`，碰撞音效：`firsthit`

### 3. 方块编号系统

- Shape 有 14 帧动画，Border 有 15 帧动画 — 每帧对应一个数字等级
- `NextNumberBlock` 决定下一个发射的方块数字
- 首局固定发射特定数字（教学用），之后随机生成（范围受 `SpawnNumber` 限制）

### 4. 合并逻辑（Merge Phase）

核心 2048 玩法：

- 方块落入网格后，系统用 `arrBM` 数组扫描**相邻同数字方块**
- 使用 `Collider` 对象做碰撞检测，判断哪些 Border 相邻
- 相同数字的相邻方块触发合并：
  - 合并间隔 `TimeBetweenMerges = 0.4` 秒（`MergeTimer` 控制）
  - 找到相邻同数字后，选出**优先级最高的**（`PriorityBorderUID`，最多连接的方块优先）
  - 其余方块向优先方块移动并消失，优先方块数字 +1
  - 加分到 `GameScore`
- **连击（Combo）**：`MergeCount` 记录连续合并次数
  - 2 连击 → 播放 `candycollapse2` 音效
  - 3 连击 → 触发特殊动画 + 音效
  - 5 连击 → 触发另一组特殊动画
- 合并产生金币（`CoinPlay`），飞向 UI 区域

### 5. 网格旋转（Rotating Grid）

- 画面上有旋转箭头按钮（`RotateArrow`，两种 type 对应两个方向）
- 点击后整个 Grid + 所有 Border 绕中心旋转（`AngleStep` 控制角度）
- `RotationIterator` 控制旋转动画步数
- 旋转后方块因重力/碰撞可能产生新的合并
- 旋转音效：`cuberotation`

### 6. 石头障碍物（Stone Spawning）

- 每隔一定回合数（`GameTurnCounter` 到达 `SpawnNumber` 的倍数时触发）
- 在网格边缘随机生成石头（数字为 0 的 Border）
- 石头不能合并，只能通过特殊方式消除
- `StoneCreating` 标记正在生成石头，期间锁定操作
- 生成音效：`concretesup`

### 7. 计分与进度

- 每次合并累加分数到 `GameScore`
- 实时对比 `TopScore`（历史最高分），超过则更新
- `MaxNumberAchieved` 追踪合成过的最大数字
  - 超过特定阈值（约 9+）且 `SpawnNumber < 15` 时，`SpawnNumber += 1`，增加可生成的数字范围（难度递增）
- 每 1000 分触发一次插屏广告（`custom.js` 中的逻辑）

### 8. 游戏结束

- 检测边界：所有格子被占满（`EdgeBorderCount` 达到阈值）
- 触发 Game Over 弹窗（`GameRPopup`），显示最终分数、金币、皇冠
- 显示 confetti 纸屑特效（`scriptsInEvents.js`）
- 结束音效：`gameresultwin` / `endoflevel`
- 可选重新开始（`GResultRestartB`）

### 9. 教程（Tutorial）

- `FirstGameOfLife = 1` 标记首次游戏
- `TutorialHand` 对象显示手势引导
- 固定前几步的发射数字，引导玩家理解合并机制
- 完成教程后通过 `LocalStorage` 存档，后续不再显示

### 10. 数据持久化（Saving Data）

- 使用 `LocalStorage` 保存：最高分、音效开关、是否完成教程
- `SaveData.dataLoaded` 标记数据是否已加载

---

## 六、游戏流程图

```
开始
 │
 ├─ Loader 布局（加载资源 + loading bar）
 │
 ├─ Game 布局启动
 │   ├─ 初始化 5×5 网格
 │   ├─ 读取存档（最高分、教程状态）
 │   ├─ 首次 → 进入教程模式
 │   └─ 生成第一个待发射方块
 │
 └─ 游戏循环 ─────────────────────────┐
     │                                 │
     ├─ 玩家发射方块（触屏/键盘）        │
     │   └─ 方块飞入网格，Pin 固定       │
     │                                 │
     ├─ 检测相邻同数字 → 合并            │
     │   ├─ 连击计数 → 特效/音效         │
     │   ├─ 加分 → 更新 UI              │
     │   └─ 递归检测新的合并             │
     │                                 │
     ├─ 回合计数器 +1                   │
     │   └─ 达到阈值 → 生成石头障碍物    │
     │                                 │
     ├─ 玩家可选旋转网格                 │
     │   └─ 旋转后可能触发新合并         │
     │                                 │
     ├─ 生成下一个待发射方块             │
     │                                 │
     ├─ 检测是否满格 ──→ 是 → Game Over │
     │                                 │
     └─ 否 → 继续循环 ─────────────────┘
```

---

## 七、本地运行

### 修复说明

原始下载的 `index.html` 内容是阿里云 OSS 的 404 错误页面（`NoSuchKey`），已替换为正确的 Construct 3 入口 HTML。

同时在 `custom.js` 中补全了 Famobi API 和 GAMESNACKS SDK 的 stub 方法，使游戏脱离平台也能运行：

- `famobi.onRequest` — 事件注册（原报错点）
- `famobi.game.isWaiting`、`famobi.hasFeature`、`famobi.log` 等运行时方法
- `GAMESNACKS` 全局对象（`gameReady`、`sendScore`、`gameOver` 等）

### 启动方式

```bash
cd game/1988901048489435138
python3 -m http.server 8080
```

然后浏览器打开 `http://localhost:8080`。

> **注意**：必须通过 HTTP 服务器访问，不能直接用 `file://` 协议打开（浏览器安全策略会阻止模块脚本和 fetch 请求）。

---

## 八、修改限制

由于核心逻辑在 `data.json` 中以 Construct 3 私有序列化格式存储，直接修改非常困难。可行的修改方式：

1. **修改全局变量初始值** — 在 `data.json` 中搜索变量 SID，修改对应的初始值（如网格大小、合并时间等）
2. **注入额外逻辑** — 通过 `scripts/project/Script.js` 中的 `Tick()` 函数
3. **修改平台适配** — 编辑 `custom.js` 中的 SDK stub
4. **使用 Construct 3 编辑器** — 需要 `.c3p` 源项目文件（当前项目中不包含，需联系原开发者获取）
