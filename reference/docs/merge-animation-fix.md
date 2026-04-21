# 合并动画修复方案

本文档记录当前 Phaser 4 实现中"糖果合并 + 石头碎裂 + 重力上升"一整套动画相对原版 C3 的偏差，并给出修改方案。

- **发现时间**：2026-04-21
- **影响文件**：
  - `apps/game/src/systems/MergeSystem.ts`
  - `apps/game/src/scenes/GameScene.ts`
  - `apps/game/src/objects/Grid.ts`（只读参考）

---

## 1. 参考场景：链式合并 + 石头碎裂

□ 是 石头 

以如下棋盘状态（截图来自原版 C3 录屏）作为修复基准：

```
       c1    c2    c3      c4    c5
r1                         32    □ 
r2                         16    4
r3    16    □     □       16
r4
r5
```

玩家把一颗 16 打入 **第 4 列**（落到 `(r3, c4)`），期望动画流：

| # | 阶段 | 时序 | 表现 |
|---|------|------|------|
| 1 | 触发 | 0ms | `(r3,c4)` 新 16 落定 |
| 2 | **源合并** | 0 – 180ms | `(r2,c4)` 的 16 **向下飞到 `(r3,c4)` 并消失**，同时播放 MergeEffect 14 帧闪光 |
| 3 | **结果出现** | 180 – 300ms | `(r3,c4)` 出现 32 + scale pop（1.3× yoyo，120ms，Back.easeOut） |
| 4 | **结果上移** | 300 – 480ms | 32 **沿列滑动到 `(r2,c4)`**（minRow 位置，不瞬移） |
| 5 | **链式合并** | 480ms 起 | 新 32 与 `(r1,c4)` 同值 → 回到第 2 步：`(r1,c4)` 飞到 `(r2,c4)`，合并成 64 |
| 6 | 结果上移 | 60ms ~ | 64 滑到 `(r1,c4)` |
| 7 | **石头碎裂** | 完成后 | `(r1,c4)` 的 64 触发周围石头（`(r1,c5)`）播放 stonedestroy 帧动画（约 500ms） |
| 8 | **重力上升** | **等 7 完成** | `(r2,c5)` 的 4 才开始向上移到 `(r1,c5)` 空格 |

**关键约束：**
- 被动到的只有**第 4 列**的 `(r2,c4)`、`(r1,c4)` 和第 5 列的 `(r1,c5)`/`(r2,c5)`
- `(r3,c1)`、`(r3,c2)` 的 16 和 `(r3,c3)` 的石头**未参与此次合并链，不应受任何影响**
- **当前 bug 观察**：`(r3,c3)` 的石头被错误消除（因为它是 `(r3,c4)` 源格子的左邻）

### 石头碎裂规则（补充）

每次合并**独立**触发一次石头碎裂检查，检查点是该次合并的 **finalRow/finalCol**（结果上移到位后的位置），**不是** landedRow，也**不是**合并组里每个 cell。

本场景两次合并的石头检查：

| 合并 | landedRow | finalRow | 检查 `(finalRow, c4)` 四邻 | 碎裂结果 |
|------|-----------|----------|---------------------------|---------|
| 16+16 → 32 | `(r3,c4)` | `(r2,c4)` | `(r1,c4)`=32、`(r3,c4)`=空、`(r2,c3)`=空、`(r2,c5)`=4 | **无石头** |
| 32+32 → 64 | `(r2,c4)` | `(r1,c4)` | `(r0,c4)`越界、`(r2,c4)`=空、`(r1,c3)`=空、`(r1,c5)`=**石头** | 只碎 `(r1,c5)` |

---

## 2. 当前实现的 3 个 Bug

### Bug #1：合并结果位置错误

**代码位置**：`apps/game/src/systems/MergeSystem.ts` 第 74-94 行

```ts
// 当前写法 —— 结果直接放在 minRow
let minRow = group.cells[0].row;
for (const cell of group.cells) {
  if (cell.row < minRow) minRow = cell.row;
}
// ...
const mergeTarget = { row: minRow, col: targetCol };
this.grid.placeBorder(mergeTarget.row, mergeTarget.col, newValue);
```

**问题**：合并值瞬间出现在最上面（minRow），跳过了"在落点生成 → 再上移"两步。用户感知的是结果"啪"地跳到顶部，没有方向感。

---

### Bug #2：缺少"结果上移"过渡动画

**代码位置**：`apps/game/src/scenes/GameScene.ts` `checkMerges()` 方法，第 1491-1539 行

```ts
// 当前写法
const result = this.mergeSystem.executeMerge(group, this.lastLandedCol);
// ... 播 MergeEffect ...
this.tweens.add({ targets: border, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);
this.time.delayedCall(400, () => this.checkMerges());
```

**问题**：
- 合并一完成就立刻走 `applyGravityUp` 和下一轮 `checkMerges`
- 没有"结果从落点沿列升到 minRow"这个中间 tween
- 链式合并（如 32 升上去后和 `(r1,c4)` 再合）视觉上是瞬间的，看不清楚

---

### Bug #3：石头碎裂的两个问题

#### 3a — 判定范围错误（哪些石头该碎）

**代码位置**：`apps/game/src/systems/MergeSystem.ts` 第 147-173 行

```ts
// 当前写法：遍历合并组里每个 cell 的四邻
const destroyedStones: { row: number; col: number }[] = [];
const checked = new Set<string>();
for (const cell of group.cells) {
  const neighbors = [
    { row: cell.row - 1, col: cell.col }, { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 }, { row: cell.row, col: cell.col + 1 },
  ];
  for (const n of neighbors) {
    // ...
    if (this.grid.isStone(n.row, n.col)) {
      this.grid.removeStone(n.row, n.col);
      destroyedStones.push(n);
    }
  }
}
```

**问题**：
- 对合并组里 **每个 cell** 的四邻都检查石头
- 本场景合并组 = `[(r2,c4), (r3,c4)]`，`(r3,c4)` 的左邻就是 `(r3,c3)` 石头 → **被错误消除**
- 原版规则：每次合并**只**检查**本次合并的 finalRow/finalCol** 四邻（即结果上移后的位置）
- 具体对照见"1. 参考场景"里的"石头碎裂规则（补充）"

#### 3b — 动画和重力上升并行

**代码位置**：`apps/game/src/scenes/GameScene.ts` `checkMerges()` 第 1531-1536 行 + `checkMergesAfterRotation()` 第 1584-1590 行

```ts
// 当前写法
if (result.destroyedStones.length > 0) {
  this.sound.play('stonedestroy', { volume: 0.3 });  // 只播音效
  // 视觉：其实并没有播 stonedestroy 帧动画（应该有但被略过）
}
this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);  // 立即拉上
```

**问题**：
- 石头 `removeStone` 只是 sprite.destroy()，**没播 stonedestroy 帧动画**
- `applyGravityUp` 立刻对石头列也上靠，`(r2,c5)` 的 4 同一帧就开始向上移
- 原版：石头帧动画播完（约 500ms）→ 才触发那一列上升

---

## 3. 修复方案

### 3.1 `MergeSystem.executeMerge` 返回两个位置

把"合并出现的物理位置"和"结果最终停留位置"分开。

**修改点**：`apps/game/src/systems/MergeSystem.ts`

新增类型：
```ts
export interface MergeResult {
  // 结果最终位置（minRow, targetCol）——重力上移后
  finalRow: number;
  finalCol: number;
  // 合并发生的视觉位置（落点：打入列内最大的同值 row；旋转时用最大 row）
  landedRow: number;
  landedCol: number;
  newValue: number;
  affectedCols: number[];
  removedCells: { row: number; col: number }[];
  destroyedStones: { row: number; col: number }[];
  ghostBorders: GhostBorder[];
}
```

核心逻辑改写：
```ts
executeMerge(group: MergeGroup, landedCol?: number): MergeResult {
  const newValue = group.value * Math.pow(2, group.cells.length - 1);

  // minRow：上靠后的最终行
  let minRow = group.cells[0].row;
  for (const cell of group.cells) if (cell.row < minRow) minRow = cell.row;

  // targetCol：打入列（优先）或组内最小列
  let targetCol: number;
  if (landedCol !== undefined && group.cells.some(c => c.col === landedCol)) {
    targetCol = landedCol;
  } else {
    targetCol = group.cells[0].col;
    for (const cell of group.cells) if (cell.col < targetCol) targetCol = cell.col;
  }

  // ★ 新增：landedRow = 目标列内最大的同值行号（最靠下那格，即"落点"）
  let landedRow = minRow;
  for (const cell of group.cells) {
    if (cell.col === targetCol && cell.row > landedRow) landedRow = cell.row;
  }

  // ghostBorders：所有 *非* 落点的源格子
  const ghostBorders: GhostBorder[] = [];
  for (const cell of group.cells) {
    if (cell.row === landedRow && cell.col === targetCol) continue;
    const b = this.grid.borders[cell.row][cell.col];
    if (b) {
      ghostBorders.push({ border: b, from: cell });
      this.grid.borders[cell.row][cell.col] = null;
      this.grid.data[cell.row][cell.col] = 0;
    }
  }

  // 落点位置：销毁旧 border（原来的 16），放上新值（32）
  this.grid.removeBorder(landedRow, targetCol);
  this.grid.placeBorder(landedRow, targetCol, newValue);

  // removedCells：所有非落点格子（用于 gravity）
  const removedCells = group.cells.filter(
    c => !(c.row === landedRow && c.col === targetCol)
  );

  // ★ 石头判定改为只查"本次合并的 finalRow/finalCol"四邻（修复 Bug #3a）
  // 理由：每次合并独立处理，石头只在"结果最终落位"的周围碎，
  // 不是所有 source cell 的周围都碎
  const destroyedStones: { row: number; col: number }[] = [];
  const finalNeighbors = [
    { row: minRow - 1, col: targetCol },
    { row: minRow + 1, col: targetCol },
    { row: minRow, col: targetCol - 1 },
    { row: minRow, col: targetCol + 1 },
  ];
  for (const n of finalNeighbors) {
    if (n.row >= 0 && n.row < GRID_ROWS && n.col >= 0 && n.col < GRID_COLS
        && this.grid.isStone(n.row, n.col)) {
      this.grid.removeStone(n.row, n.col);
      destroyedStones.push(n);
    }
  }

  const affectedCols = [...new Set([
    ...group.cells.map(c => c.col),
    ...destroyedStones.map(s => s.col),
  ])];

  return {
    finalRow: minRow,          // 结果最终要去的行
    finalCol: targetCol,
    landedRow,                 // 结果先出现在的行
    landedCol: targetCol,
    newValue,
    affectedCols,
    removedCells,
    destroyedStones,
    ghostBorders,
  };
}
```

### 3.2 `GameScene.checkMerges` 串联五阶段 Promise 链

**修改点**：`apps/game/src/scenes/GameScene.ts`

新增 helper（放在 `animateMergeGhosts` 附近）：
```ts
// Phase 3: 结果从落点滑到 finalRow
private slideResultToFinalRow(
  row: number, col: number, finalRow: number
): Promise<void> {
  return new Promise(resolve => {
    if (row === finalRow) { resolve(); return; }
    const border = this.grid.borders[row][col];
    if (!border) { resolve(); return; }

    // 物理交换：把 border 从 (row,col) 移到 (finalRow,col)
    this.grid.borders[finalRow][col] = border;
    this.grid.data[finalRow][col] = border.value;
    this.grid.borders[row][col] = null;
    this.grid.data[row][col] = 0;
    border.gridRow = finalRow;

    const { x, y } = this.grid.localCellToPixel(finalRow, col);
    this.tweens.add({
      targets: border, x, y,
      duration: 180, ease: 'Quad.easeOut',
      onComplete: () => resolve(),
    });
  });
}

// Phase 4: 石头碎裂动画完成后再 resolve
private playStoneDestroyAndWait(
  stones: { row: number; col: number }[]
): Promise<void> {
  return new Promise(resolve => {
    if (stones.length === 0) { resolve(); return; }
    this.sound.play('stonedestroy', { volume: 0.3 });
    this.playStoneDestroyEffects(stones);
    // STONE_DESTROY_FRAMES.length * frameDuration ≈ 500ms
    const wait = STONE_DESTROY_FRAMES.length * STONE_DESTROY_FRAME_DURATION_MS + 20;
    this.time.delayedCall(wait, () => resolve());
  });
}
```

改写 `checkMerges`（示意 async 版本）：
```ts
private async checkMerges(): Promise<void> {
  const groups = this.mergeSystem.findMergeGroups();
  if (groups.length === 0) {
    this.lastLandedCol = undefined;
    this.respawnWithSequence();
    return;
  }

  groups.sort((a, b) => b.cells.length - a.cells.length);
  const group = groups[0];
  const result = this.mergeSystem.executeMerge(group, this.lastLandedCol);

  this.addScore(result.newValue);
  this.sound.play('collapse1', { volume: 0.4 });
  this.lastLandedCol = result.finalCol;

  // Phase 2 — 源 → 落点（Ghost 飞 + 淡出 + MergeEffect 闪光）
  this.animateMergeGhosts(result.ghostBorders, result.landedRow, result.landedCol);
  this.playMergeEffectFrames([{ row: result.landedRow, col: result.landedCol }]);

  // Phase 3 — 落点 scale pop
  const landedBorder = this.grid.borders[result.landedRow][result.landedCol];
  if (landedBorder) {
    this.tweens.add({
      targets: landedBorder,
      scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true, ease: 'Back.easeOut',
    });
  }

  // 等 ghost 飞完 + pop 完成
  await this.waitMs(240);

  // Phase 4 — 结果从 landedRow 滑到 finalRow
  await this.slideResultToFinalRow(
    result.landedRow, result.landedCol, result.finalRow
  );

  // Phase 5 — 石头碎裂动画（串行，不和 gravity 同时）
  await this.playStoneDestroyAndWait(result.destroyedStones);

  // Phase 6 — 重力上升（只处理石头碎裂那些列）
  this.applyGravityUp(result.destroyedStones);

  // Phase 7 — 链式合并
  this.time.delayedCall(200, () => this.checkMerges());
}

private waitMs(ms: number): Promise<void> {
  return new Promise(resolve => this.time.delayedCall(ms, () => resolve()));
}
```

### 3.3 `checkMergesAfterRotation` 同步改造

旋转合并没有 `landedCol` 概念，`executeMerge(group)` 不带参数时 `MergeSystem` 用 **组内最小列** 作为 targetCol，**组内最大行** 作为 landedRow（新逻辑自动满足）。

其余流程与 `checkMerges` 完全一致，只是末尾递归调 `checkMergesAfterRotation` 且不 `respawnWithSequence`。

### 3.4 `removedCells` 不再进 `applyGravityUp`

**原因**：Phase 3 的"结果上移"已经把落点上方的空格填了。其他非落点 `removedCells` 如果存在（比如 3 格以上合并），也会在 Phase 3 的 sliding 过程中自然吸收。

**调整**：`applyGravityUp` 的调用参数从 `[...result.removedCells, ...result.destroyedStones]` 改为只传 `result.destroyedStones`，避免把第 3 列以外（比如旋转触发的合并）的格子错误拉动。

---

## 4. 时序对照表

**修复前：**
```
0ms    合并数据完成
0ms    32 直接出现在 minRow（无过渡）
0ms    MergeEffect 14 帧启动（560ms）
0ms    scale pop 启动（240ms yoyo）
0ms    applyGravityUp 启动（150ms，包括石头列）
400ms  递归 checkMerges
```

**修复后：**
```
0ms      源 Border 飞向落点（180ms, Quad.easeIn）
0ms      MergeEffect 14 帧启动（560ms）
0-120ms  落点 32 放置 + scale pop 启动（240ms yoyo）
240ms    结果从落点滑向 finalRow（180ms, Quad.easeOut）
420ms    stonedestroy 帧动画开始（若有）
         └ 帧数 × 帧时长 ≈ 500ms
920ms    applyGravityUp 触发（150ms tween）
1070ms   递归 checkMerges（进入下一轮链式合并）
```

链式场景（16+16 → 32 → 32+32 → 64）总时长约 **2.5s**，和原版 C3 观感吻合。

---

## 5. 实施 Checklist

- [x] `MergeSystem.ts`：新增 `landedRow/landedCol` 字段（已完成）
- [x] `MergeSystem.ts`：ghost 判定条件改为"非落点"而非"非 minRow"（已完成）
- [ ] `MergeSystem.ts`：`destroyedStones` 判定范围从"group 每个 cell 四邻"改为**只查 finalRow/finalCol 四邻**（Bug #3a）
- [ ] `GameScene.ts`：新增 `waitMs()`、`slideResultToFinalRow()`、`playStoneDestroyAndWait()` 三个 helper
- [ ] `GameScene.ts`：`checkMerges` 和 `checkMergesAfterRotation` 改为 `async` 串行化
- [ ] `GameScene.ts`：`applyGravityUp` 调用参数去掉 `removedCells`
- [ ] TS 类型检查通过（`npx tsc --noEmit`）
- [ ] 手动验证用例：
  - [ ] 2 格合并（16+16 → 32）只在打入列动，其他格不受影响
  - [ ] **源格子隔壁的石头不应被消除**（本文档场景的 `(r3,c3)` 石头）
  - [ ] 3 格链式（16+16→32，32+32→64）每步都能看到"落点 pop → 滑到目标"
  - [ ] 石头碎裂完成动画后，上方糖果才开始上移
  - [ ] 旋转触发合并不崩
  - [ ] DEBUG 保存 + 刷新恢复不受影响

---

## 6. 待确认问题

1. **落点定义**：在 `checkMerges` 里用 `lastLandedCol`（新糖果打入列）+ "该列内组内最大行号"；但**如果打入列内只有一个同值格**呢？此时 landedRow = finalRow，跳过 Phase 4 滑动即可，代码里已用 `if (row === finalRow) resolve()` 处理。

2. **旋转合并是否需要"源飞向落点"视觉**：当前方案默认复用。如果你希望旋转时更快/更直接（比如瞬移），`checkMergesAfterRotation` 可以去掉 Phase 3 的 sliding，只保留 Phase 2 的 ghost fly。

3. **MergeEffect 位置**：当前在 `landedRow/landedCol` 播放。如果希望在 `finalRow` 播（即糖果"到站"后才闪），需要把 `playMergeEffectFrames` 移到 `slideResultToFinalRow` 的 `onComplete`。
