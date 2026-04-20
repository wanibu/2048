# Construct 3 从零重建 Giant 2048 — 完整教程

> **目标**：零基础用户从注册 Construct 3 账号开始，利用现有素材，在编辑器中逐步重建一个功能完整的 Giant 2048 游戏。
>
> **最终产出**：一个可编辑的 `.c3p` 项目文件，可导出为 HTML5 网页游戏。
>
> **素材来源**：本项目 `game/1988901048489435138/` 目录下的图片和音效文件。

---

## 目录

- [第 1 章：Construct 3 快速入门](#第-1-章construct-3-快速入门)
- [第 2 章：最小可玩版 — 发射与碰撞](#第-2-章最小可玩版--发射与碰撞)
- [第 3 章：合并系统](#第-3-章合并系统)
- [第 4 章：计分与 UI](#第-4-章计分与-ui)
- [第 5 章：旋转网格](#第-5-章旋转网格)
- [第 6 章：石头与难度递增](#第-6-章石头与难度递增)
- [第 7 章：音效与动画](#第-7-章音效与动画)
- [第 8 章：教程引导与数据存档](#第-8-章教程引导与数据存档)
- [附录 A：素材清单](#附录-a素材清单)
- [附录 B：全局变量参考表](#附录-b全局变量参考表)
- [附录 C：完整事件表逻辑参考](#附录-c完整事件表逻辑参考)

---

## 第 1 章：Construct 3 快速入门

### 本章目标

- 注册 Construct 3 账号并进入编辑器
- 了解编辑器界面的主要区域
- 创建 Giant 2048 空项目并完成基础设置

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **编辑器** | Construct 3 是一个完全基于浏览器的 2D 游戏引擎，打开网页就能用，无需安装 |
| **Layout（布局）** | 相当于"场景"或"关卡"，是游戏中的一个画面。每个 Layout 可包含多个 Layer |
| **Layer（图层）** | Layout 中的层级，控制对象的前后遮挡关系，类似 Photoshop 的图层 |
| **Event Sheet（事件表）** | 游戏逻辑的载体。用"条件 → 动作"的方式描述游戏行为，不需要写代码 |
| **Project Bar（项目栏）** | 左侧面板，显示项目中的所有资源：布局、事件表、对象、声音等 |

### 步骤

#### 1.1 注册账号

1. 打开浏览器，访问 https://editor.construct.net
2. 点击右上角 **Sign up** 注册账号（支持 Google 登录）
3. 免费版限制：每个事件表最多 25 个事件、每个布局最多 2 个图层。初期学习够用，后续可升级付费版（约 $7/月）解锁完整功能

#### 1.2 认识编辑器界面

登录后点击 **New Project**，你会看到以下区域：

```
┌─────────────────────────────────────────────────┐
│                    菜单栏                         │
├────────┬──────────────────────────┬──────────────┤
│        │                          │              │
│ 项目栏  │      布局视图（画布）      │   属性面板    │
│Project │    Layout View           │  Properties  │
│  Bar   │                          │              │
│        │                          │              │
│        │                          │              │
├────────┴──────────────────────────┴──────────────┤
│                  底部工具栏                        │
└─────────────────────────────────────────────────┘
```

- **项目栏（左）**：管理所有资源。展开后可以看到 Layouts、Event sheets、Object types、Sounds 等文件夹
- **布局视图（中）**：可视化编辑场景，拖放对象、调整位置大小
- **属性面板（右）**：选中任何对象后，这里显示它的详细属性（位置、大小、行为等）
- **底部工具栏**：切换 Layout 视图和 Event Sheet 视图

#### 1.3 创建项目

1. 点击 **Menu → Project → New → New empty project**
2. 在弹出的对话框中设置：
   - **Name**：`Giant 2048`
   - **Viewport size**：`640 × 960`（竖屏手机比例）
   - **其他保持默认**，点击 **Create**

#### 1.4 设置项目属性

1. 在项目栏中点击项目名称 `Giant 2048`
2. 在右侧属性面板中设置：
   - **Fullscreen mode**：`Scale outer`（按比例缩放，多余部分留黑边）
   - **Sampling**：`Trilinear`（三线性过滤，图像更平滑）
   - **Pixel rounding**：`No`

#### 1.5 创建布局和图层

我们需要 3 个布局：

**创建 Loader 布局（已有默认 Layout）：**
1. 在项目栏中找到 `Layouts` → 右键默认的 `Layout 1` → **Rename** → 改名为 `Loader`
2. 对应的事件表也会自动重命名

**创建 Game 布局：**
1. 右键 `Layouts` → **Add layout**
2. 命名为 `Game`
3. 选中 `Game` 布局，在底部工具栏找到 **Layers 面板**（如果没看到，点击 **View → Bars → Layers Bar**）
4. 创建以下图层（**从下到上**）：
   - `Play` — 主游戏层（网格、方块）
   - `Animation` — 特效层（合并动画、爆炸）
   - `HUD` — 界面层（分数、按钮）
   - `Popup` — 弹窗层（暂停、游戏结束）
   - `SoundButtonLayer` — 音量按钮层

> **注意**：免费版限制每个布局最多 2 个图层。如果你使用免费版，可以先只创建 `Play` 和 `HUD` 两个图层，后续升级后再添加其他图层。

**创建 Menu 布局：**
1. 同样右键 `Layouts` → **Add layout** → 命名为 `Menu`

#### 1.6 设置起始布局

1. 在项目栏中右键 `Loader` 布局 → **Set as first layout**
2. 这样游戏启动时会先显示加载画面

#### 1.7 保存项目

- 按 `Ctrl + S` 保存
- Construct 3 会保存为 `.c3p` 文件到你的本地或云端

### 本章检查点

完成后你应该有：
- [x] 一个名为 `Giant 2048` 的 Construct 3 项目
- [x] 3 个布局：Loader、Game、Menu
- [x] Game 布局包含多个图层
- [x] 画布尺寸 640×960

---

## 第 2 章：最小可玩版 — 发射与碰撞

### 本章目标

- 创建游戏网格和弹弓
- 实现方块发射（触屏 + 键盘）
- 方块碰到网格后停下来

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **Sprite（精灵）** | 游戏中的可见对象，可以有多个动画帧。几乎所有游戏元素都是 Sprite |
| **Animation Frame（动画帧）** | 一个 Sprite 可以包含多帧图片。Giant 2048 中每个数字对应一帧 |
| **Behavior（行为）** | 附加给对象的预制功能。比如 Bullet（子弹运动）、Pin（钉住）等 |
| **Instance Variable（实例变量）** | 每个对象实例独有的数据。比如每个方块有自己的 Number 值 |
| **Event Sheet（事件表）** | 用 "条件 → 动作" 描述逻辑，如"当触摸结束 → 发射方块" |

### 步骤

#### 2.1 导入素材

首先把现有项目的素材文件准备好。你需要的图片文件在 `game/1988901048489435138/images/` 目录下：

| 文件 | 用途 |
|------|------|
| `shape-sheet0.png` | 数字方块精灵图（14 帧，每帧 128×128） |
| `shared-0-sheet0.png` ~ `sheet4.png` | 共享素材（网格背景等） |
| `playbackground-sheet0.png` | 游戏背景 |
| `border-sheet0.png` | 网格中的方块（15 帧） |

#### 2.2 创建网格背景

1. 切换到 `Game` 布局，选择 `Play` 图层
2. 双击画布空白区域 → 在弹出的对象选择器中选择 **Sprite** → 命名为 `Grid`
3. 在弹出的动画编辑器中：
   - 点击右上角文件夹图标 **Load image**
   - 找到并选择网格背景图片（从 `shared-0-sheet0.png` 中裁剪，或直接加载）
   - 关闭动画编辑器
4. 在布局中调整 Grid 的位置：将其居中放置在画布中
5. 在属性面板中确认尺寸大约覆盖 5×5 的游戏区域

#### 2.3 创建数字方块（Shape）

1. 双击画布 → **Sprite** → 命名为 `Shape`
2. 在动画编辑器中：
   - 加载 `shape-sheet0.png`
   - 这是一个精灵表（sprite sheet），包含 14 帧。你需要使用 **Strip import** 功能：
     - 右键动画帧列表 → **Import sprite strip / tile sheet**
     - 设置每帧尺寸 128×128
     - Construct 3 会自动切割成 14 帧
   - 每一帧对应一个数字等级（帧 0 = 数字 1，帧 1 = 数字 2，帧 2 = 数字 3...）
3. 给 Shape 添加实例变量：
   - 在属性面板中找到 **Instance variables** → 点击 **Add**
   - 添加 `Number`（类型：Number，初始值：0）— 当前方块的数字
   - 添加 `SlingShape`（类型：Number，初始值：0）— 是否是弹弓上的方块
4. 给 Shape 添加行为：
   - 在属性面板中找到 **Behaviors** → 点击 **Add**
   - 添加 **Bullet** — 让方块能像子弹一样飞出去
     - 设置 `Speed`：`0`（初始不动，发射时再设置速度）
     - 设置 `Gravity`：`0`
   - 添加 **Pin** — 让方块能钉住在网格上

#### 2.4 创建网格方块（Border）

1. 双击画布 → **Sprite** → 命名为 `Border`
2. 动画编辑器中导入 `border-sheet0.png`，同样切割成 15 帧
3. 添加实例变量：
   - `Number`（Number，0）— 方块数字
   - `CoinUID`（Number，0）
4. 添加行为：
   - **Fade** — 消失动画
   - **Pin** — 位置固定
   - **Tween** — 平滑动画
5. 在布局中先**不要放置** Border 实例（它们会在游戏运行时动态创建）

#### 2.5 创建弹弓（Sling）

1. 双击画布 → **Sprite** → 命名为 `Sling`
2. 用一个简单的弹弓图片（可以从 `shared-0-sheet` 系列图片中找到，或暂时用一个占位图）
3. 将 Sling 放置在网格下方中央位置（大约 x=320, y=800）
4. 创建一个 Shape 实例放在弹弓位置上，设置其 `SlingShape = 1`，作为待发射的方块

#### 2.6 创建碰撞检测器（Collider）

1. 双击画布 → **Sprite** → 命名为 `Collider`
2. 用一个小的透明/隐藏的方形图片
3. 设置 `Initial visibility`：`Invisible`
4. 这个对象用于检测方块与网格的碰撞

#### 2.7 添加输入对象

Construct 3 中，输入需要专门的对象：

1. 在项目栏中右键 `Object types` → **Add new object type**
2. 添加 **Touch** 对象（处理触摸/鼠标输入）
3. 添加 **Keyboard** 对象（处理键盘输入）

这些是非可视对象，不会出现在画布上。

#### 2.8 编写发射逻辑（Event Sheet）

切换到 Game 布局的事件表（点击布局底部的 **Event sheet** 标签页，或在项目栏中双击 `Game` 的事件表）。

**事件 1：触摸发射**

```
条件: Touch → On tap/click object → Sling
动作: Shape (SlingShape = 1) → Bullet: Set speed → 800
      Shape (SlingShape = 1) → Set SlingShape → 0
```

操作步骤：
1. 点击 **Add event**（或右键空白区域 → Add event）
2. 选择 `Touch` → 选择条件 `On tap object` → 选择 `Sling`
3. 点击 **Add action**
4. 但我们先需要选中正确的 Shape — 点击 **Add another condition**：
   - 选择 `Shape` → `Compare instance variable` → `SlingShape` `= 1`
5. 现在添加动作：
   - 选择 `Shape` → `Bullet` → `Set speed` → 输入 `800`
6. 再添加一个动作：
   - 选择 `Shape` → `Set value` → `SlingShape` → 设为 `0`

**事件 2：方块飞出后碰到边界停下**

```
条件: Shape → Bullet: Compare speed → > 0
      Shape → Is overlapping → Grid（或到达网格Y坐标范围）
动作: Shape → Bullet: Set speed → 0
      Shape → Pin: Pin to → （位置固定）
```

操作步骤：
1. **Add event** → 选择 `Shape` → `Compare instance variable` → `SlingShape = 0`
2. **Add another condition** → `Shape` → `Bullet` → `Compare speed` → `> 0`
3. **Add another condition** → `Shape` → `Compare Y` → `≤ 网格底部 Y 坐标`（根据你的网格位置调整，比如 `≤ 550`）
4. **Add action** → `Shape` → `Bullet` → `Set speed` → `0`

> **注意**：这只是最简化的碰撞逻辑。完整的碰撞需要检测具体落在网格哪个格子，后续章节会完善。

**事件 3：发射后生成新方块**

```
条件: Shape (SlingShape = 0) → Bullet: Speed = 0
      System → Trigger once
动作: System → Create object → Shape → 在弹弓位置
      Shape → Set SlingShape → 1
      Shape → Set animation frame → random(0, 5)
      Shape → Bullet: Set speed → 0
```

**事件 4：键盘发射（空格键）**

```
条件: Keyboard → On key pressed → Space
      Shape → Compare instance variable → SlingShape = 1
动作: Shape → Bullet: Set speed → 800
      Shape → Set SlingShape → 0
```

#### 2.9 测试运行

1. 点击工具栏上的 **播放按钮 ▶**（或按 F5）
2. Construct 3 会在新标签页中打开游戏预览
3. 你应该能看到：
   - 网格背景
   - 弹弓位置上有一个数字方块
   - 点击/按空格后方块向上飞出
   - 方块到达网格区域后停下

> **如果不生效**：检查事件表中的条件和动作是否正确，确认 Shape 的 Bullet 行为的 `Set angle` 设为 `-90`（向上）。

### 本章检查点

完成后你应该有：
- [x] Shape 精灵，包含 14 帧动画和实例变量
- [x] Border 精灵（暂未使用，下一章使用）
- [x] 弹弓发射逻辑（触摸 + 键盘）
- [x] 方块飞到网格区域会停下
- [x] 发射后自动生成新方块

---

## 第 3 章：合并系统

### 本章目标

- 方块落入网格后转换为 Border 对象
- 检测相邻的同数字方块
- 实现合并：相同数字的方块合为一个，数字 +1

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **Array（数组）** | 存储数据的容器。我们用 5×5 的二维数组来记录网格状态 |
| **Function（函数）** | 可复用的事件块。把合并逻辑封装成函数，方便反复调用 |
| **For 循环** | 遍历数组或对象的所有实例 |
| **Pick by comparison** | 根据条件筛选特定对象实例 |
| **UID** | 每个对象实例的唯一标识符，用来精确指定某个方块 |

### 步骤

#### 3.1 创建棋盘数组

1. 在项目栏中右键 `Object types` → **Add new object type** → 选择 **Array**
2. 命名为 `arrBM`（Board Merge）
3. 在属性面板中设置：
   - `Width`：5
   - `Height`：5
   - `Depth`：1
4. 这个数组用来追踪每个网格位置的 Border UID（0 = 空格）

#### 3.2 网格坐标系统

定义全局变量来描述网格的几何参数。切换到事件表，右键空白区域 → **Add global variable**：

| 变量名 | 类型 | 初始值 | 说明 |
|--------|------|--------|------|
| `Columns` | Number | 5 | 列数 |
| `Rows` | Number | 5 | 行数 |
| `CellSize` | Number | 93.5 | 每格像素大小 |
| `pixelOffsetX` | Number | 86.25 | 网格左上角 X 偏移 |
| `LayoutBeginY` | Number | 0 | 网格起始 Y（根据实际布局调整） |

计算方块位置的公式：
- `X = pixelOffsetX + 列号 * CellSize + CellSize / 2`
- `Y = LayoutBeginY + 行号 * CellSize + CellSize / 2`

#### 3.3 方块落地转换为 Border

当 Shape（飞行中的方块）停下后，需要在最近的网格位置创建一个 Border：

**创建函数 "PlaceOnGrid"：**

1. 在事件表中右键 → **Add function** → 命名为 `PlaceOnGrid`
2. 添加参数：`gridX`（Number）、`gridY`（Number）、`number`（Number）

函数内容：
```
条件: （无条件，函数被调用时直接执行）
动作: System → Create object → Border → Layer "Play"
      → X: pixelOffsetX + gridX * CellSize + CellSize/2
      → Y: LayoutBeginY + gridY * CellSize + CellSize/2
      Border → Set animation frame → number
      Border → Set Number → number
      arrBM → Set at XY → (gridX, gridY) → Border.UID
```

#### 3.4 Shape 落地时找到最近的网格位置

修改第 2 章的"方块停下"事件：

```
条件: Shape → SlingShape = 0
      Shape → Bullet: Speed = 0
      System → Trigger once
动作: → 计算最近的网格坐标
      Local variable gridX = round((Shape.X - pixelOffsetX) / CellSize - 0.5)
      Local variable gridY = round((Shape.Y - LayoutBeginY) / CellSize - 0.5)
      → clamp gridX 在 0~4 范围内
      → clamp gridY 在 0~4 范围内
      → 调用 PlaceOnGrid(gridX, gridY, Shape.Number)
      → 销毁 Shape
```

操作步骤：
1. 在停下的事件中添加两个局部变量（右键事件 → Add local variable）
2. 用表达式计算 gridX 和 gridY
3. 添加动作：调用 `PlaceOnGrid` 函数
4. 添加动作：`Shape` → `Destroy`

#### 3.5 合并检测逻辑

合并的核心：遍历所有 Border，找到相邻的同数字方块。

**创建函数 "CheckMerge"：**

```
函数 CheckMerge:

  // 遍历每个网格位置
  条件: System → For "x" from 0 to Columns-1
        System → For "y" from 0 to Rows-1
  
  子事件:
    // 读取当前位置的值
    条件: arrBM → Value at (loopindex("x"), loopindex("y")) ≠ 0
    动作: Local variable currentUID = arrBM.At(loopindex("x"), loopindex("y"))
    
    子事件:
      // 选中当前 Border
      条件: Border → Pick by UID → currentUID
      
      子事件:
        // 检查右边邻居
        条件: loopindex("x") + 1 < Columns
              arrBM.At(loopindex("x")+1, loopindex("y")) ≠ 0
        动作: Local variable neighborUID = arrBM.At(loopindex("x")+1, loopindex("y"))
        
        子事件:
          条件: Border → Pick by UID → neighborUID
                Border.Number = （当前Border的Number）
          动作: → 调用 DoMerge(currentUID, neighborUID, loopindex("x"), loopindex("y"))
```

同理检查下方邻居（`loopindex("y") + 1`）。

#### 3.6 执行合并

**创建函数 "DoMerge"：**

```
函数 DoMerge (winnerUID, loserUID, gridX, gridY):

  // 胜出者数字 +1
  条件: Border → Pick by UID → winnerUID
  动作: Border → Set Number → Border.Number + 1
        Border → Set animation frame → Border.Number
  
  // 失败者消失
  条件: Border → Pick by UID → loserUID
  动作: Border → Fade: Start fade
        → 从 arrBM 中清除 loserUID 的位置
  
  // 延迟后再次检查（连锁合并）
  动作: System → Wait → 0.4 seconds
        → 调用 CheckMerge
```

#### 3.7 在方块落地后触发合并检测

在 3.4 节的落地事件最后添加：

```
动作: System → Wait → 0.2 seconds
      → 调用 CheckMerge
```

### 本章检查点

完成后你应该有：
- [x] arrBM 数组追踪网格状态
- [x] Shape 落地后转换为 Border 并放到正确的网格位置
- [x] 相邻同数字方块自动合并
- [x] 合并后数字 +1，动画帧更新
- [x] 支持连锁合并（一次合并可能触发新的合并）

---

## 第 4 章：计分与 UI

### 本章目标

- 显示当前分数和最高分
- 合并时加分
- 游戏结束判定

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **Text 对象** | 在画面上显示文字（分数、提示等） |
| **全局变量** | 在所有事件表中共享的变量，贯穿整个游戏 |
| **表达式（Expression）** | 在动作中使用的计算公式，如 `GameScore + Border.Number * 10` |
| **Compare 条件** | 比较两个值的大小关系 |

### 步骤

#### 4.1 创建全局变量

在 Game 事件表中添加以下全局变量（右键 → Add global variable）：

| 变量名 | 类型 | 初始值 | 说明 |
|--------|------|--------|------|
| `GameScore` | Number | 0 | 当前分数 |
| `TopScore` | Number | 0 | 历史最高分 |
| `MergeCount` | Number | 0 | 连续合并次数 |
| `MaxNumberAchieved` | Number | 0 | 达到的最大数字 |
| `GameTurnCounter` | Number | 0 | 回合计数器 |

#### 4.2 创建 Text 对象

1. 切换到 Game 布局，选择 `HUD` 图层
2. 双击画布 → 选择 **Text** → 命名为 `ScoreText`
3. 属性设置：
   - 位置：画面上方合适的位置（如 x=320, y=30）
   - Font size：24
   - Color：白色
   - Horizontal alignment：Center
   - 初始文本：`"0"`
4. 同样创建 `TopScoreText`，放在分数旁边

#### 4.3 合并时加分

修改第 3 章的 `DoMerge` 函数，在合并动作后添加：

```
动作: System → Set value → GameScore → GameScore + (Border.Number + 1) * 10
      System → Add to → MergeCount → 1
```

#### 4.4 实时更新分数显示

添加一个每帧执行的事件（或在合并后执行）：

```
条件: System → Every tick
动作: ScoreText → Set text → GameScore
      TopScoreText → Set text → TopScore
```

#### 4.5 更新最高分

```
条件: System → Compare variable → GameScore > TopScore
动作: System → Set value → TopScore → GameScore
```

#### 4.6 游戏结束判定

遍历整个数组，如果没有空位且没有可合并的相邻方块，则游戏结束：

**创建函数 "CheckGameOver"：**

```
函数 CheckGameOver:

  Local variable emptyCount = 0
  
  条件: System → For "x" from 0 to Columns-1
        System → For "y" from 0 to Rows-1
  子事件:
    条件: arrBM.At(loopindex("x"), loopindex("y")) = 0
    动作: Add 1 to emptyCount
  
  // 如果没有空位
  条件: emptyCount = 0
  子事件:
    // 检查是否还有可合并的（简化版：检查相邻同数字）
    // 如果没有可合并的 → 游戏结束
    动作: → 显示 Game Over 弹窗
```

#### 4.7 Game Over 弹窗

1. 在 Game 布局的 `Popup` 图层上创建以下对象：
   - `PopupBackground`（Sprite）— 半透明黑色背景
   - `GameOverText`（Text）— 显示 "Game Over"
   - `FinalScoreText`（Text）— 显示最终分数
   - `RestartButton`（Sprite）— 重新开始按钮
2. 初始时全部设为不可见（`Initial visibility: Invisible`）
3. 游戏结束时设为可见：

```
// 在 CheckGameOver 确认结束后
动作: PopupBackground → Set visible
      GameOverText → Set visible → Set text → "Game Over"
      FinalScoreText → Set visible → Set text → "Score: " & GameScore
      RestartButton → Set visible
```

4. 点击重新开始：

```
条件: Touch → On tap object → RestartButton
动作: System → Go to layout → "Game"
```

> `Go to layout` 会重新加载整个布局，所有变量和对象恢复初始状态（除了全局变量，需要手动重置）。

### 本章检查点

完成后你应该有：
- [x] 画面上方显示当前分数和最高分
- [x] 每次合并后分数增加
- [x] 分数超过最高分时自动更新
- [x] 网格满且无法合并时显示 Game Over
- [x] 可以点击重新开始

---

## 第 5 章：旋转网格

### 本章目标

- 添加旋转按钮
- 点击后整个网格旋转 90 度
- 旋转后方块重新排列并检查合并

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **Tween 行为** | 让对象在一段时间内平滑地从一个状态过渡到另一个状态（位置、角度、大小等） |
| **角度计算** | 使用三角函数计算旋转后的坐标 |
| **坐标变换** | 将网格坐标系旋转 90 度：`(x,y) → (y, Rows-1-x)` 或 `(x,y) → (Columns-1-y, x)` |

### 步骤

#### 5.1 创建旋转按钮

1. 在 Game 布局的 `HUD` 图层创建两个 Sprite：
   - `RotateLeftBtn` — 逆时针旋转按钮，放在网格左侧
   - `RotateRightBtn` — 顺时针旋转按钮，放在网格右侧
2. 使用旋转箭头图片（可以从素材中提取或用简单的箭头图标）

#### 5.2 创建旋转全局变量

```
全局变量: RotationBusy (Number, 0)  // 是否正在旋转中，防止重复点击
```

#### 5.3 旋转逻辑 — 数据层

旋转网格本质是对 arrBM 数组做矩阵旋转。

**创建函数 "RotateGridCW"（顺时针旋转）：**

```
函数 RotateGridCW:

  // 创建临时数组存储旋转后的数据
  Local variable tempArr (用另一个 Array 对象，或用多个局部变量)
  
  // 顺时针 90°: 新坐标 (x,y) = 旧坐标 (Rows-1-y, x)
  条件: System → For "x" from 0 to Columns-1
        System → For "y" from 0 to Rows-1
  动作: // 读取旧位置 (Rows-1-loopindex("y"), loopindex("x")) 的值
        // 写入新位置 (loopindex("x"), loopindex("y"))
        
  // 更新所有 Border 的实际位置
  条件: System → For each → Border
  子事件:
    // 根据 Border 在数组中的新位置，用 Tween 移动到新坐标
    条件: Border → Number > 0
    动作: Border → Tween: Start → 
          → To X: pixelOffsetX + newGridX * CellSize + CellSize/2
          → To Y: LayoutBeginY + newGridY * CellSize + CellSize/2
          → Duration: 0.3
```

类似地创建 "RotateGridCCW"（逆时针）。

#### 5.4 视觉旋转

为了视觉效果，同时旋转 Grid 精灵：

```
动作: Grid → Tween: Start → Angle → 目标角度 → Duration: 0.3
```

旋转完成后重置 Grid 角度（因为内容已经重新排列了）。

#### 5.5 绑定按钮事件

```
// 顺时针
条件: Touch → On tap object → RotateRightBtn
      System → Compare variable → RotationBusy = 0
动作: System → Set value → RotationBusy → 1
      → 调用 RotateGridCW
      System → Wait → 0.3
      System → Set value → RotationBusy → 0
      → 调用 CheckMerge

// 逆时针
条件: Touch → On tap object → RotateLeftBtn
      System → Compare variable → RotationBusy = 0
动作: System → Set value → RotationBusy → 1
      → 调用 RotateGridCCW
      System → Wait → 0.3
      System → Set value → RotationBusy → 0
      → 调用 CheckMerge
```

#### 5.6 键盘旋转

```
条件: Keyboard → On key pressed → Q（或 A）
动作: → 调用 RotateGridCCW 的逻辑

条件: Keyboard → On key pressed → E（或 D）
动作: → 调用 RotateGridCW 的逻辑
```

### 本章检查点

完成后你应该有：
- [x] 两个旋转箭头按钮
- [x] 点击后网格内容旋转 90 度（有平滑动画）
- [x] 旋转后自动检查合并
- [x] 旋转期间不能重复点击

---

## 第 6 章：石头与难度递增

### 本章目标

- 每隔若干回合生成石头障碍
- 石头不能合并，占据网格空间
- 随着游戏进行，难度逐渐增加

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **计数器逻辑** | 用全局变量记录回合数，每 N 回合触发一次事件 |
| **random() 表达式** | 生成随机数，用于随机选择空位 |
| **System → Pick random** | 从符合条件的实例中随机选一个 |
| **取模运算 (%)** | `GameTurnCounter % SpawnNumber = 0` 判断是否到了生成回合 |

### 步骤

#### 6.1 添加全局变量

```
全局变量: SpawnNumber (Number, 5)  // 每隔多少回合生成石头
```

#### 6.2 回合计数

每次玩家发射一个方块，回合数 +1。在方块落地事件中添加：

```
动作: System → Add to → GameTurnCounter → 1
```

#### 6.3 石头生成逻辑

**创建函数 "TrySpawnStone"：**

```
函数 TrySpawnStone:

  // 检查是否到了生成回合
  条件: GameTurnCounter % SpawnNumber = 0
        GameTurnCounter > 0
  
  子事件:
    // 找一个随机空位
    Local variable randX = 0
    Local variable randY = 0
    Local variable found = 0
    Local variable attempts = 0
    
    条件: System → While → found = 0 AND attempts < 50
    动作: Set randX → floor(random(Columns))
          Set randY → floor(random(Rows))
          Add 1 to attempts
          
    子事件:
      条件: arrBM.At(randX, randY) = 0
      动作: Set found → 1
    
    // 在空位创建石头（Number = 0 的 Border）
    条件: found = 1
    动作: System → Create object → Border → Layer "Play"
          → X: pixelOffsetX + randX * CellSize + CellSize/2
          → Y: LayoutBeginY + randY * CellSize + CellSize/2
          Border → Set Number → 0
          Border → Set animation frame → 0  // 第 0 帧是石头外观
          arrBM → Set at → (randX, randY) → Border.UID
```

#### 6.4 在落地事件中调用

在方块落地并完成合并检查后：

```
动作: → 调用 TrySpawnStone
```

#### 6.5 合并时排除石头

修改 `CheckMerge` 函数，在比较数字时排除 Number = 0 的方块：

```
条件: Border → Number > 0  // 添加此条件，跳过石头
```

#### 6.6 难度递增

当玩家合成更大的数字时，增加可生成的方块种类：

```
// 在 DoMerge 函数中
条件: Border.Number > MaxNumberAchieved
动作: System → Set value → MaxNumberAchieved → Border.Number

// 检查是否提升难度
子事件:
  条件: MaxNumberAchieved > 9
        SpawnNumber < 15
  动作: System → Add to → SpawnNumber → 1
```

这意味着：
- 初始时方块数字范围 1~5，每 5 回合生成石头
- 合成出大数字后，范围扩大（如 1~6），石头生成频率也降低

### 本章检查点

完成后你应该有：
- [x] 每 N 回合自动在空位生成石头
- [x] 石头不参与合并
- [x] 游戏难度随进度递增

---

## 第 7 章：音效与动画

### 本章目标

- 添加背景音乐和操作音效
- 合并时播放特效动画
- 连击时显示 Combo 文字

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **Audio 对象** | 管理游戏中所有声音的播放、暂停、音量控制 |
| **Sound vs Music** | Construct 3 区分短音效（Sound）和背景音乐（Music），分开管理 |
| **Fade 行为** | 对象在一段时间内渐渐消失并自动销毁，适合一次性特效 |
| **Spawn 动作** | 在某个对象的位置创建另一个对象 |
| **动画帧控制** | 可以设置播放速度、是否循环、播放完毕后的回调 |

### 步骤

#### 7.1 导入音效文件

1. 在项目栏中右键 `Sounds` 文件夹 → **Import sounds**
2. 从 `game/1988901048489435138/media/` 目录导入以下文件：

| 文件 | 用途 | 导入为 |
|------|------|--------|
| `slingshot1.webm` | 发射音效 1 | Sound |
| `slingshot2.webm` | 发射音效 2 | Sound |
| `slingshot3.webm` | 发射音效 3 | Sound |
| `firsthit.webm` | 碰撞音效 | Sound |
| `candycollapse1.webm` | 合并音效（普通） | Sound |
| `candycollapse2.webm` | 合并音效（连击） | Sound |
| `cuberotation.webm` | 旋转音效 | Sound |
| `concretesup.webm` | 石头生成音效 | Sound |
| `combo.webm` | 连击音效 | Sound |
| `wow.webm` | 惊叹音效 | Sound |
| `gameresultwin.webm` | 结束音效 | Sound |
| `giantost2.webm` | 背景音乐 | Music |

3. 在项目栏中右键 `Object types` → 添加 **Audio** 对象（非可视对象）

> **注意**：Construct 3 推荐同时提供 `.ogg` 和 `.m4a` 格式以兼容所有浏览器。`.webm` 格式在大多数现代浏览器中可用。

#### 7.2 播放背景音乐

在 Game 事件表中添加：

```
条件: System → On start of layout
      System → Compare variable → Sound = 1
动作: Audio → Play → "giantost2" (looping, volume = 音量)
```

#### 7.3 发射音效

在发射事件中添加：

```
动作: Audio → Play → "slingshot" & choose(1,2,3) (not looping)
```

`choose(1,2,3)` 随机选择 1/2/3，实现随机音效变化。

> **实际操作**：Construct 3 中用 `choose("slingshot1","slingshot2","slingshot3")` 表达式来随机选取。

#### 7.4 合并音效

在 `DoMerge` 函数中：

```
条件: MergeCount = 1  // 普通合并
动作: Audio → Play → "candycollapse1"

条件: MergeCount >= 2  // 连击
动作: Audio → Play → "candycollapse2"
```

#### 7.5 创建合并特效

1. 创建 Sprite `MergeEffect`
   - 导入 `mergeeffect-sheet0.png`、`sheet1.png`、`sheet2.png`
   - 设置动画 Speed 较高（如 30），Loop = No
   - 添加行为 **Destroy after animation**（或用事件：动画播放完毕时销毁）
2. 在 `DoMerge` 函数中，合并发生时：

```
动作: System → Create object → MergeEffect
      → 在胜出 Border 的位置
      MergeEffect → Set animation frame → 0
      MergeEffect → Start animation from beginning
```

#### 7.6 连击文字（Combo）

1. 创建 Sprite `ComboSprite`
   - 用包含 "x2"、"x3"、"x4"... 文字的图片，或使用 Text 对象
   - 添加 **Tween** 行为和 **Fade** 行为
2. 连击时显示：

```
条件: MergeCount >= 2
动作: System → Create object → ComboSprite → 在合并位置上方
      ComboSprite → Set text / frame → "x" & MergeCount
      ComboSprite → Tween: Start → Y → Y - 50 → Duration 0.5
      ComboSprite → Fade: Start
```

#### 7.7 音量控制按钮

1. 在 `SoundButtonLayer` 图层创建 `SoundButton` Sprite
   - 两帧：音量开 / 音量关
2. 添加事件：

```
条件: Touch → On tap object → SoundButton
动作: System → Set value → Sound → 1 - Sound  // 切换 0/1
      
子事件:
  条件: Sound = 0
  动作: Audio → Set master volume → -100 (静音)
        SoundButton → Set animation frame → 1 (静音图标)
  
  条件: Sound = 1
  动作: Audio → Set master volume → 0 (正常)
        SoundButton → Set animation frame → 0 (音量图标)
```

### 本章检查点

完成后你应该有：
- [x] 背景音乐循环播放
- [x] 发射、碰撞、合并、旋转各有音效
- [x] 合并时有视觉特效
- [x] 连击时显示 Combo 文字
- [x] 音量开关按钮

---

## 第 8 章：教程引导与数据存档

### 本章目标

- 首次游戏时显示操作引导
- 使用 LocalStorage 保存最高分和设置
- 游戏重启时恢复数据

### 本章涉及的 C3 概念

| 概念 | 说明 |
|------|------|
| **LocalStorage** | 浏览器本地存储，游戏关闭后数据不丢失 |
| **异步操作** | LocalStorage 的读写是异步的，需要用"On item get"等事件处理回调 |
| **条件分支** | 根据 FirstGameOfLife 变量走不同逻辑 |
| **Tween 动画** | 引导手指的移动动画 |

### 步骤

#### 8.1 添加全局变量

```
全局变量: FirstGameOfLife (Number, 1)   // 1 = 第一次玩
全局变量: FirstGameOfPlay (Number, 1)   // 1 = 本局第一次
```

#### 8.2 添加 LocalStorage 对象

1. 项目栏 → 添加 **Local storage** 对象（非可视对象）

#### 8.3 游戏启动时读取存档

```
条件: System → On start of layout (Game)
动作: LocalStorage → Get item → "TopScore"
      LocalStorage → Get item → "Sound"
      LocalStorage → Get item → "FirstGameOfLife"
```

```
条件: LocalStorage → On item get → "TopScore"
动作: System → Set value → TopScore → LocalStorage.ItemValue

条件: LocalStorage → On item get → "Sound"
动作: System → Set value → Sound → LocalStorage.ItemValue

条件: LocalStorage → On item get → "FirstGameOfLife"
动作: System → Set value → FirstGameOfLife → LocalStorage.ItemValue
```

#### 8.4 保存数据

**创建函数 "SaveGame"：**

在以下时机调用：游戏结束时、新最高分时、音量切换时。

```
函数 SaveGame:
  动作: LocalStorage → Set item → "TopScore" → TopScore
        LocalStorage → Set item → "Sound" → Sound
        LocalStorage → Set item → "FirstGameOfLife" → 0
```

#### 8.5 创建教程引导

1. 在 `HUD` 图层创建 Sprite `TutorialHand`
   - 使用手指/箭头图片
   - 添加 **Tween** 行为（让手指做上下移动动画）
   - 添加 **Fade** 行为
   - 初始不可见
2. 添加实例变量 `TutorialState`（Number，0）— 教程进度

#### 8.6 教程流程

```
// 布局开始时，如果是第一次玩
条件: System → On start of layout
      System → Compare variable → FirstGameOfLife = 1
动作: TutorialHand → Set visible
      TutorialHand → Set position → 弹弓位置上方
      TutorialHand → Tween: Start → Y → 弹弓Y → Duration 1 → Repeat

// 第一步：固定发射特定数字
条件: FirstGameOfLife = 1
      FirstGameOfPlay = 1
动作: → 强制 NextNumberBlock = 1  // 教程中固定发射数字 1
```

```
// 玩家第一次发射后
条件: GameTurnCounter = 1
      FirstGameOfLife = 1
动作: TutorialHand → 移动到旋转按钮位置
      → 指引玩家旋转
```

```
// 教程完成（玩家完成 3-5 次操作后）
条件: GameTurnCounter >= 3
      FirstGameOfLife = 1
动作: System → Set value → FirstGameOfLife → 0
      TutorialHand → Fade: Start fade
      → 调用 SaveGame
```

#### 8.7 完善游戏流程

最后确保各布局之间的跳转正确：

```
// Loader 布局 → 加载完成后跳转
条件: System → On start of layout (Loader)
动作: System → Wait → 2 seconds
      System → Go to layout → "Game"

// Game Over 后点重启
条件: Touch → On tap object → RestartButton
动作: → 调用 SaveGame
      System → Go to layout → "Game"
```

### 本章检查点

完成后你应该有：
- [x] 首次游戏时显示手指引导
- [x] 教程完成后不再显示
- [x] 最高分、音量设置保存在 LocalStorage
- [x] 游戏重启后恢复存档数据

---

## 附录 A：素材清单

### 图片文件

所有图片位于 `game/1988901048489435138/images/` 目录下：

| 文件名 | 尺寸 | 用途 | 导入方式 |
|--------|------|------|----------|
| `shape-sheet0.png` | 精灵表 | 数字方块（14帧，每帧128×128） | Sprite → Import sprite strip |
| `border-sheet0.png` | 精灵表 | 网格方块（15帧） | Sprite → Import sprite strip |
| `displayshape-sheet0.png` | 精灵表 | 预览方块 | Sprite → Import sprite strip |
| `shared-0-sheet0.png` | 大图 | 网格/UI/按钮等共享素材 | 需裁剪后导入 |
| `shared-0-sheet1.png` | 大图 | 共享素材 | 需裁剪后导入 |
| `shared-0-sheet2.png` | 大图 | 共享素材 | 需裁剪后导入 |
| `shared-0-sheet3.png` | 大图 | 共享素材 | 需裁剪后导入 |
| `shared-0-sheet4.png` | 大图 | 共享素材 | 需裁剪后导入 |
| `playbackground-sheet0.png` | 单图 | 游戏背景 | Sprite → Load image |
| `popupbackground-sheet0.png` | 单图 | 弹窗背景 | Sprite → Load image |
| `girl-sheet0.png` | 精灵表 | 角色形象 | Sprite → Import sprite strip |
| `mergeeffect-sheet0/1/2.png` | 精灵表 | 合并特效 | Sprite → Import sprite strip |
| `borderexplodeanimation-sheet0/1/2.png` | 精灵表 | 爆炸特效 | Sprite → Import sprite strip |
| `stonedestroy-sheet0.png` | 精灵表 | 石头消除 | Sprite → Import sprite strip |
| `highestnumbermerge-sheet0.png` | 精灵表 | 最高数字特效 | Sprite → Import sprite strip |
| `loaderbar-sheet0.png` | 单图 | 加载条 | Sprite → Load image |
| `tiledbackground-sheet0.png` | 单图 | 平铺背景 | TiledBackground → Load image |

### 音效文件

所有音效位于 `game/1988901048489435138/media/` 目录下：

| 文件名 | 用途 | 类型 |
|--------|------|------|
| `giantost2.webm` | 背景音乐 | Music |
| `slingshot1.webm` | 发射音效 1 | Sound |
| `slingshot2.webm` | 发射音效 2 | Sound |
| `slingshot3.webm` | 发射音效 3 | Sound |
| `firsthit.webm` | 碰撞音效 | Sound |
| `candycollapse1.webm` | 合并音效 | Sound |
| `candycollapse2.webm` | 连击合并音效 | Sound |
| `candycrunch1.webm` | 消除音效 1 | Sound |
| `candycrunch2.webm` | 消除音效 2 | Sound |
| `cuberotation.webm` | 旋转音效 | Sound |
| `concretesup.webm` | 石头生成音效 | Sound |
| `concretedestroy.webm` | 石头消除音效 | Sound |
| `combo.webm` | 连击音效 | Sound |
| `wow.webm` | 惊叹音效 | Sound |
| `buttonfinal.webm` | 按钮音效 | Sound |
| `endoflevel.webm` | 关卡结束 | Sound |
| `gameresultwin.webm` | 胜利音效 | Sound |

### 图标文件

位于 `game/1988901048489435138/icons/` 目录下：

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| `loading-logo.png` | - | 加载 Logo |
| `icon-16.png` | 16×16 | 网页图标 |
| `icon-32.png` | 32×32 | 网页图标 |
| `icon-114.png` | 114×114 | iOS 图标 |
| `icon-128.png` | 128×128 | 应用图标 |
| `icon-256.png` | 256×256 | 高清图标 |

---

## 附录 B：全局变量参考表

以下是原版 Giant 2048 中使用的所有全局变量，供复刻时参考：

| 变量名 | 类型 | 初始值 | 用途 | 引入章节 |
|--------|------|--------|------|----------|
| Columns | Number | 5 | 网格列数 | 第 3 章 |
| Rows | Number | 5 | 网格行数 | 第 3 章 |
| CellSize | Number | 93.5 | 每格像素大小 | 第 3 章 |
| pixelOffsetX | Number | 86.25 | 网格 X 偏移 | 第 3 章 |
| LayoutBeginY | Number | 0 | 网格起始 Y | 第 3 章 |
| GameScore | Number | 0 | 当前分数 | 第 4 章 |
| TopScore | Number | 0 | 历史最高分 | 第 4 章 |
| OldTopScore | Number | 0 | 上一次最高分 | 第 4 章 |
| MergeCount | Number | 0 | 连续合并次数 | 第 4 章 |
| MaxNumberAchieved | Number | 0 | 合成的最大数字 | 第 4 章 |
| GameTurnCounter | Number | 0 | 回合计数器 | 第 4 章 |
| SpawnNumber | Number | 5 | 生成数字范围/石头间隔 | 第 6 章 |
| NextNumberBlock | Number | 0 | 下一个方块数字 | 第 2 章 |
| MergeTimer | Number | 0.4 | 合并计时器 | 第 3 章 |
| TimeBetweenMerges | Number | 0.4 | 合并间隔（秒） | 第 3 章 |
| Sound | Number | 1 | 音效开关 | 第 7 章 |
| FirstGameOfLife | Number | 1 | 是否首次游戏 | 第 8 章 |
| FirstGameOfPlay | Number | 1 | 是否首次开局 | 第 8 章 |
| ShootAvailable | Number | 0 | 是否可发射 | 第 2 章 |
| SlingTouch | Number | 0 | 弹弓触控状态 | 第 2 章 |
| EdgeBorderCount | Number | 0 | 边缘方块计数 | 第 4 章 |
| PriorityBorderUID | Number | 0 | 优先合并目标 | 第 3 章 |
| PriorityLargestMergeCount | Number | 0 | 合并优先级计数 | 第 3 章 |
| StoneCreating | Boolean | false | 是否正在生成石头 | 第 6 章 |
| RotationBusy | Number | 0 | 是否正在旋转 | 第 5 章 |

---

## 附录 C：完整事件表逻辑参考

以下是从原版 `data.json` 中反向解析出的事件表结构，按功能模块整理。你在 Construct 3 中搭建事件时可以对照参考。

### GameSheet 事件表总览

```
GameSheet (64 项)
├── Include: FamobiAPISheet
├── 全局变量 × 38
├── 事件组 × 13 (均为动态激活)
│   ├── [30] 背景音乐播放
│   ├── [31] 布局初始化（生成网格、初始化变量）
│   ├── [32] 生成下一个方块
│   ├── [33] 金币飞行动画
│   ├── [35] 边界检测（方块是否在网格内）
│   ├── [36] 最高分更新
│   ├── [39] 方块落地处理（检测位置、合并准备）
│   ├── [40] 碰撞检测
│   ├── [41] 合并执行（加分、音效、连击）
│   ├── [42] 旋转后重新排列
│   ├── [43] 重力下落
│   ├── [62] 额外逻辑 1
│   └── [63] 额外逻辑 2
└── 函数 × 11
    ├── Merge Phase — 合并阶段控制
    ├── Rotating Grid — 旋转入口
    ├── Rotation Action — 旋转执行
    ├── Shapes Shooting — 发射控制（8个事件，含触屏+键盘）
    ├── Animation — 特效动画（22个事件）
    ├── UI — 界面更新（15个事件）
    ├── Objects Positions — 对象定位
    ├── Tutorial — 教程引导
    ├── Stone spawning — 石头生成
    ├── Saving Data — 数据存档
    └── Famobi API — 平台接口
```

### 核心逻辑伪代码

#### 发射流程
```
当 玩家触摸弹弓 或 按下空格键:
  如果 ShootAvailable = 1 且 存在 SlingShape 方块:
    设置 Shape.Bullet.Speed = 800
    设置 Shape.SlingShape = 0
    设置 ShootAvailable = 0
    播放 slingshot 音效

当 Shape 到达网格区域 (Y <= 网格底部):
  Shape.Bullet.Speed = 0
  计算最近网格坐标 (gridX, gridY)
  如果 该位置已有方块:
    寻找最近的空位
  在 (gridX, gridY) 创建 Border
  销毁 Shape
  GameTurnCounter += 1
  调用 CheckMerge()
  调用 TrySpawnStone()
  生成新的 SlingShape 方块
```

#### 合并流程
```
函数 CheckMerge():
  MergeCount = 0
  遍历每个 Border:
    找到所有相邻的同数字 Border
    记录连接数最多的为 PriorityBorder
  
  如果 找到可合并的:
    MergeCount += 1
    PriorityBorder.Number += 1
    其他同数字 Border → 移动到 PriorityBorder 位置 → 消失
    GameScore += 分数
    播放合并音效
    如果 MergeCount >= 2: 显示 Combo 特效
    等待 0.4 秒
    递归调用 CheckMerge()  // 连锁合并
  否则:
    检查游戏是否结束
```

#### 旋转流程
```
当 玩家点击旋转按钮:
  如果 RotationBusy = 0:
    RotationBusy = 1
    对 arrBM 做矩阵旋转 (顺时针或逆时针)
    所有 Border 用 Tween 移动到新位置
    Grid 用 Tween 旋转 90°
    等待动画完成
    RotationBusy = 0
    调用 CheckMerge()
```

---

> **提示**：这份教程基于对原版 Giant 2048 导出文件的逆向分析。由于 Construct 3 事件表的序列化格式是私有的，部分逻辑可能有简化。建议在实际搭建过程中边做边测试，逐步完善。
>
> **相关文档**：
> - [ANALYSIS.md](../../ANALYSIS.md) — 原版项目的完整技术分析
> - [Construct 3 官方文档](https://www.construct.net/en/make-games/manuals/construct-3)
> - [Construct 3 初学者教程](https://www.construct.net/en/tutorials)
