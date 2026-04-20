# Giant 2048 Phaser 3 重建 — 设计文档

**日期**: 2026-04-09
**状态**: 已批准

## 概述

用 Phaser 3 + TypeScript + Vite 重建 Giant 2048 弹弓合并游戏，部署在 Cloudflare Pages（前端）+ Workers（后端验证）。

## 技术栈

- **Phaser 3.80+** — 游戏引擎
- **TypeScript** — 类型安全
- **Vite** — 构建工具
- **Cloudflare Pages** — 前端部署
- **Cloudflare Workers + Hono** — 后端 API
- **Cloudflare D1** — 排行榜数据库

## 项目结构

```
2048_Phaser3/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/assets/              ← 精灵图、音效
├── src/
│   ├── main.ts                 ← 入口，创建 Phaser.Game
│   ├── config.ts               ← 常量（网格尺寸、颜色表、难度参数）
│   ├── scenes/
│   │   ├── BootScene.ts        ← 资源加载
│   │   ├── MenuScene.ts        ← 主菜单
│   │   └── GameScene.ts        ← 核心游戏场景
│   ├── objects/
│   │   ├── Shape.ts            ← 可发射数字方块（Sprite + Arcade Body）
│   │   ├── Border.ts           ← 网格中的固定方块
│   │   ├── Grid.ts             ← 5×5 网格管理器（坐标、旋转、数组）
│   │   ├── Sling.ts            ← 弹弓控制器（拖拽/键盘输入）
│   │   └── Stone.ts            ← 石头障碍
│   ├── systems/
│   │   ├── MergeSystem.ts      ← 合并检测 + 执行 + 连击
│   │   ├── ScoreSystem.ts      ← 计分 + 最高分
│   │   ├── RotateSystem.ts     ← 网格旋转（数据层 + 视觉动画）
│   │   └── DifficultySystem.ts ← 石头生成 + 难度递增
│   ├── ui/
│   │   ├── HUD.ts              ← 分数显示、旋转按钮
│   │   ├── GameOverPopup.ts    ← 游戏结束弹窗
│   │   └── TutorialOverlay.ts  ← 教程引导
│   └── shared/
│       └── game-logic.ts       ← 纯函数：合并判定、计分验证（前后端共享）
├── workers/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.ts            ← Hono 路由
│       ├── verify.ts           ← 重放验证逻辑
│       └── db.ts               ← D1 排行榜读写
```

## 核心架构

### Scene 流程

```
BootScene（加载资源）→ MenuScene（主菜单）→ GameScene（游戏）
                                              ↓
                                        GameOver popup
                                              ↓
                                        MenuScene（返回）
```

### 游戏循环

```
选列 → 发射 Shape → 碰撞检测 → 落地定位 → 合并扫描 → 连击判定 → 石头生成 → 下一回合
```

### 物理系统

使用 Phaser Arcade Physics：
- Shape 发射：设置 `body.velocity.y` 向上
- 碰撞检测：`overlap` 检测 Shape 与 Border/Grid 边界
- 落地后禁用物理，转换为 Border 对象

### 网格系统（Grid）

- 5×5 二维数组 `arrBM[row][col]` 追踪每个格子的值
- 坐标转换：网格坐标 ↔ 像素坐标
- 方块落地时 snap 到最近的网格位置

### 合并系统（MergeSystem）

- BFS 扫描相邻同值方块
- 优先合并连接数最多的组
- 合并后值翻倍，触发 Tween 动画 + 粒子特效
- 连击窗口 0.4s，连续合并触发 Combo 动画和额外音效

### 旋转系统（RotateSystem）

- 数据层：矩阵顺时针/逆时针转置
- 视觉层：所有方块 Tween 旋转到新位置
- 旋转后触发重力检测 + 级联合并

### 难度系统（DifficultySystem）

- 回合计数器
- 达到阈值后在网格边缘生成石头（value=0，不可合并）
- 随回合递增石头生成频率

### 计分系统（ScoreSystem）

- 合并加分：合并后的值即为得分
- 连击倍率加成
- LocalStorage 存储最高分
- 提交时发送到 Workers 验证

## 服务端验证

### 操作录制

前端每一步记录：
```typescript
interface GameAction {
  turn: number;
  type: 'shoot' | 'rotate';
  col?: number;        // 发射列
  value?: number;      // 方块值
  direction?: 'cw' | 'ccw'; // 旋转方向
}
```

### 验证流程

```
前端提交 { actions: GameAction[], finalScore: number, seed: number }
    ↓
Workers 用 shared/game-logic.ts 重放所有操作
    ↓
计算期望分数，与 finalScore 对比
    ↓
匹配 → 写入 D1 排行榜
不匹配 → 拒绝（HTTP 403）
```

### Workers API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/submit-score` | POST | 提交分数 + 操作序列验证 |
| `/api/leaderboard` | GET | 获取排行榜 |

## 素材迁移

从原项目复制到 `public/assets/`：
- `images/*.png` — 精灵图（shape、border、特效、UI）
- `media/*.webm` — 音效和背景音乐

Phaser 使用 `this.load.spritesheet()` 和 `this.load.audio()` 加载。

## 输入支持

- **触屏**：拖拽弹弓发射，点击旋转按钮
- **鼠标**：同触屏
- **键盘**：左右方向键选列，空格/回车发射，Q/E 旋转

## 响应式适配

- 游戏画布基准尺寸 360×640（竖屏）
- Phaser `scale.mode = ScaleModes.FIT` 自动适配窗口
- 触屏和桌面均可用

## 第一阶段（骨架）目标

1. Vite + Phaser 项目可运行
2. 三个场景（Boot/Menu/Game）可切换
3. 5×5 网格渲染
4. 基础弹弓发射 + 方块碰撞落地
5. 本地 dev server 可预览
