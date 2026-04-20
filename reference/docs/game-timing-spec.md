# Giant 2048 — 游戏动画时序规范

> 参考原版 Construct 3 实现，核心节奏单位 400ms

## 回合状态机

```
空闲 → 发射 → 飞行 → 落地 → 合并循环 → 石头处理 → 弹弓装填 → Game Over 检查 → 空闲
```

每个阶段期间禁止射击和旋转输入（`isResolvingTurn = true`），直到回到空闲状态。

## 各阶段时序

### 1. 发射（Shoot）
- 弹弓释放动画：即时
- 音效：slingshot

### 2. 飞行（Flight）
- 方式：Tween 缓动
- 时长：`max(200, distance * 0.5)` ms
- 缓动：`Quad.easeIn`

### 3. 落地（Land）
- Shape 销毁 → Border 创建
- 落地弹跳动画：**250ms**（scaleX/Y 1.0→1.15→1.0, yoyo）
- 音效：slingshot2
- 落地后等待：**400ms** → 进入合并检查

### 4. 合并循环（Merge Loop）
- 合并检测：BFS 扫描相邻同值
- 如果有合并：
  - 合并动画：**300ms**（Tween 移动到合并位置）
  - 消除旧块 + 创建新块
  - 重力上靠动画：**200ms**
  - 等待：**400ms** → 再次合并检测（递归）
- 如果无合并：→ 进入石头处理

### 5. 石头处理（Stone Processing）
- 从 TokenQueue 获取待处理石头数量（`pendingStones`）
- 每个石头：
  - 检查棋盘是否有空位
  - 有空位：随机选空位生成石头，出现动画 **200ms**（scale 0→1, Back.easeOut）
  - 无空位：丢弃该石头
  - 音效：stonesup
  - 石头间等待：**400ms**
- 全部石头处理完 → Game Over 检查 → 进入弹弓装填

### 6. 弹弓装填（Respawn）
- 当前糖果：立即装填到弹弓
- 下一个糖果预览：延迟 **350ms** 后显示
- 装填完成 → `isResolvingTurn = false` → 空闲

### 7. 直接合并（Direct Merge）
- 列满时底行同值 → 直接合并
- 合并动画：**250ms**
- 等待：**400ms** → 进入合并循环（同上）
- 走相同的石头处理和装填流程

## Game Over 检查时机

仅在以下两个时机：
1. 合并循环结束后（无更多合并时）
2. 石头生成后

检查逻辑：当前弹弓糖果在 4 种旋转状态（0°/90°/180°/270°）下都无法放入任何列 → Game Over

## 超时机制

- 45 秒无操作 → 显示 "HURRY UP" 催促
- 再过 15 秒 → Game Over（endReason: timeout）
- 任何操作重置计时器

## 时间常量汇总

| 常量 | 值 | 说明 |
|---|---|---|
| FLIGHT_MIN_DURATION | 200ms | 飞行最短时间 |
| FLIGHT_SPEED_FACTOR | 0.5 | 飞行时间 = distance * factor |
| LAND_BOUNCE_DURATION | 250ms | 落地弹跳动画 |
| POST_LAND_DELAY | 400ms | 落地后等待（核心节奏） |
| MERGE_ANIM_DURATION | 300ms | 合并动画 |
| GRAVITY_DURATION | 200ms | 重力上靠动画 |
| POST_MERGE_DELAY | 400ms | 合并后等待（核心节奏） |
| STONE_SPAWN_ANIM | 200ms | 石头出现动画 |
| STONE_INTERVAL_DELAY | 400ms | 多个石头之间的间隔 |
| NEXT_PREVIEW_DELAY | 350ms | 下一个糖果预览延迟 |
| HURRY_UP_IDLE | 45000ms | 催促倒计时 |
| TIMEOUT_AFTER_HURRY | 15000ms | 催促后超时 |
