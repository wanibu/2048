# 预生成序列测试系统

## 当前代码实现说明

下面的大部分章节描述的是目标设计，但仓库当前代码已经落地了一版“过渡实现”。  
如果你要核对实际数据流，请优先看这两个文件：

- 协议图：[current-game-protocol-flow.puml](/Users/yibu/dev_workspace/github.com/2048/docs/current-game-protocol-flow.puml)
- 当前实现代码：
  - [workers/src/index.ts](/Users/yibu/dev_workspace/github.com/2048/2048_Phaser3/workers/src/index.ts:1)
  - [src/systems/ActionRecorder.ts](/Users/yibu/dev_workspace/github.com/2048/2048_Phaser3/src/systems/ActionRecorder.ts:1)

### 当前代码实际数据流

当前代码不是纯“低频两次交互”模式，而是下面这套：

1. `start-game`
   - 返回 `gameId`
   - 返回完整 `sequence`
   - 返回 `sequencePlanId`
   - 返回 `generatedSequenceId`
   - 返回初始 `sign`
2. 游戏过程中
   - 前端只从 `start-game.sequence` 消费内容
   - 数字字符串表示糖果
   - `"stone"` 表示前端立即生成一个石头障碍
   - 当前糖果和下一个糖果预览都从这条序列本地推进
3. 每次操作仍然调用 `/api/action`
   - `shoot`
   - `rotate`
   - `direct_merge`
   - 后端继续推进 `sign` 签名链
4. 分数仍然可通过 `/api/update-score` 实时写回
5. 结束时调用 `/api/end-game`
   - 提交 `gameId`
   - 提交 `finalSign`
   - 提交 `finalScore`
   - 提交 `endReason`
6. `/api/submit-game`
   - 当前只是 `/api/end-game` 的兼容别名
   - 请求体与 `/api/end-game` 一致

### 当前代码中的唯一来源原则

当前代码已经遵守这一点：

- 弹弓当前糖果，只来自 `start-game.sequence`
- 下一个糖果坑位，只来自 `start-game.sequence`
- 石头生成事件，只来自 `start-game.sequence` 里的 `"stone"`

当前代码不会再从这些来源补内容：

- 本地随机糖果池
- `extend-sequence`
- 独立石头计数器
- 旧硬编码概率表

### 当前接口现状

| 接口 | 当前状态 | 说明 |
|------|------|------|
| `/api/start-game` | 主流程 | 开局，返回完整序列和初始签名 |
| `/api/action` | 主流程 | 每步操作，推进签名链 |
| `/api/update-score` | 主流程 | 实时更新分数 |
| `/api/end-game` | 主流程 | 用 `finalSign` 结束对局 |
| `/api/submit-game` | 兼容接口 | 当前是 `/api/end-game` 的别名 |
| `/api/extend-sequence` | 已废弃 | 当前 sequence 一次性下发，不再使用 |

## 概念

| 术语 | 说明 |
|------|------|
| **内容种类** | 13种糖果（#2, #4, #8, #16, #32, #64, #128, #256, #512, #1024, #2048, #4096, #8192）+ 1种石头（#stone） |
| **Stage** | 一段生成规则，定义该阶段的长度、可出现的种类及各自概率 |
| **Sequence Plan** | 多个 Stage 按顺序串联组成的完整玩法方案 |
| **Generated Sequence** | 根据某个 Sequence Plan 实际生成的一条完整序列，存入数据库，作为可复用测试样本供多个玩家体验 |

## Stages 配置示例

| Stage | 糖果数 | 种类与概率 |
|------|------|------|
| A | 1-30 | #2 25%, #4 25%, #8 10%, #16 10%, #32 8%, #64 7%, #128 5%, #256 5%, #stone 5% |
| B | 31-60 | #2 20%, #4 20%, #8 10%, #16 10%, #32 8%, #64 7%, #128 7%, #256 6%, #512 5%, #1024 3%, #stone 4% |
| C | 61-90 | #4 18%, #8 10%, #16 9%, #32 8%, #64 8%, #128 8%, #256 7%, #512 7%, #1024 6%, #2048 5%, #4096 4%, #8192 3%, #stone 7% |
| D | 91-120 | #16 12%, #32 12%, #64 12%, #128 11%, #256 10%, #512 10%, #1024 9%, #2048 8%, #4096 6%, #8192 5%, #stone 5% |

- 每个 Stage 的长度可由管理员自定义
- 每个 Stage 内所有概率总和必须严格等于 100%
- 上面的 A/B/C/D 只是示例配置，后台实际数值可由管理员调整

## Sequence Plans

管理员将多个 Stage 串联组成玩法方案：

```text
plan1 = Stage A(30个) + Stage B(30个) + Stage C(30个) + Stage D(30个) → 共120个糖果
plan2 = Stage A(50个) + Stage C(50个) → 共100个糖果
plan3 = ...
```

可创建任意数量的玩法方案（plan1, plan2, plan3 ... planN）

## 生成与使用

系统根据某个 `sequence_plan` 的规则，按阶段概率生成一条完整序列，存入数据库：

| 字段 | 说明 |
|------|------|
| `generated_sequence_id` | UUID，唯一标识 |
| `sequence_plan_id` | 该序列所属的玩法方案 |
| `sequence` | 实际生成出的完整序列数据 |

## 开局流程

玩家开始游戏 → 随机分配一个 `sequence_plan` → 取该方案下的一条 `generated_sequence` → 按序列顺序发放内容

说明：
- 多个玩家可以玩同一个 `sequence_plan`
- 多个玩家也可以重复体验同一个 `generated_sequence`
- `generated_sequence` 的目标不是一次性库存，而是可复用测试样本
- 最终通过玩家数据评估哪个 `sequence_plan` 或 `generated_sequence` 更好玩

## 接口模式

系统采用“整局结果上报模式”，不再使用逐步签名链校验。

### 低频交互原则

系统采用低频交互模式：

- 开局时与后端交互一次，获取本局信息和完整序列
- 结束时与后端交互一次，提交整局结果
- 游戏过程中不进行逐步上报，不频繁访问数据库

因此，主流程只保留两次核心交互：

- `start-game`
- `submit-game`

以下旧模式接口不再属于主流程：

- `extend-sequence`
- `action`
- `update-score`
- 基于 `sign` 的逐步签名链校验

### 序列唯一来源原则

本局所有可消费内容都只能来自 `start-game` 返回的 `sequence`，不能从其他任何来源生成。

包括但不限于：

- 弹弓当前糖果
- 底部坑位中的下一个糖果预览
- `"stone"` 触发的障碍物生成

因此，前端只负责解释和消费这条序列，不允许从以下来源补充内容：

- 本地随机生成
- `extend-sequence`
- 旧的硬编码概率表
- 其他接口单独返回的“下一个糖果”
- 任何未记录在本局 `sequence` 中的临时内容

说明：
- 数字字符串表示一个可发射糖果
- `"stone"` 表示一次生成障碍物的指令，不是可发射道具
- 前端在消费到 `"stone"` 时，应立即触发石头生成，再继续向后读取，直到拿到下一个可发射糖果

### 1. `start-game`

开局时返回当前局信息与本局要使用的序列。

建议响应字段：

| 字段 | 说明 |
|------|------|
| `gameId` | 当前游戏局 ID |
| `sequencePlanId` | 本局所属玩法方案 |
| `generatedSequenceId` | 本局实际使用的预生成序列 |
| `sequence` | 本局可用的完整序列数据，或首批序列数据 |

### 2. `submit-game`

游戏结束后，前端一次性提交整局结果。

建议请求字段：

| 字段 | 说明 |
|------|------|
| `gameId` | 当前游戏局 ID |
| `finalScore` | 最终得分 |
| `actionsCount` | 本局操作总数 |
| `endReason` | 结束原因，如 `gameover` / `timeout` / `restart` |

可选扩展字段：

| 字段 | 说明 |
|------|------|
| `durationMs` | 本局时长 |
| `highestValue` | 本局合成的最高值 |
| `rotateCount` | 旋转次数 |
| `shootCount` | 发射次数 |

说明：
- 前端负责整局本地游玩逻辑
- 后端负责记录本局归属的 `sequence_plan` 与 `generated_sequence`
- 后端负责保存整局结果，用于后续玩法评估与排行榜统计

## 数据库表设计

### 1. `stages`

存储单个阶段的长度与概率配置。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID / TEXT PK | 阶段唯一标识 |
| `name` | TEXT | 阶段名称，如 `A`、`B`、`early_easy` |
| `length` | INTEGER | 该阶段包含多少个位置 |
| `probabilities` | JSON / TEXT | 概率配置，键为内容类型，值为百分比 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

约束：
- `length > 0`
- `probabilities` 内所有概率之和必须等于 `100`

### 2. `sequence_plans`

存储完整玩法方案。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID / TEXT PK | 方案唯一标识 |
| `name` | TEXT | 方案名称，如 `plan1` |
| `description` | TEXT | 方案说明 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

### 3. `sequence_plan_stages`

维护 `sequence_plans` 和 `stages` 的顺序关系。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID / TEXT PK | 关联记录唯一标识 |
| `sequence_plan_id` | UUID / TEXT FK | 所属玩法方案 |
| `stage_id` | UUID / TEXT FK | 所属阶段 |
| `stage_order` | INTEGER | 阶段顺序，从 1 开始 |
| `created_at` | DATETIME | 创建时间 |

约束：
- 同一个 `sequence_plan_id` 下，`stage_order` 必须唯一

### 4. `generated_sequences`

存储按某个玩法方案实际生成出的完整序列。每条记录可作为可复用测试样本，被多个玩家重复体验。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID / TEXT PK | 实际序列唯一标识 |
| `sequence_plan_id` | UUID / TEXT FK | 该序列来源的玩法方案 |
| `sequence_data` | JSON / TEXT | 生成出的完整序列内容 |
| `sequence_length` | INTEGER | 完整序列长度 |
| `status` | TEXT | 状态，如 `enabled` / `disabled` |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

### 5. `games`

存储玩家的每一局游戏，并关联到本局所使用的玩法方案和预生成序列。

| 字段 | 类型 | 说明 |
|------|------|------|
| `game_id` | UUID / TEXT PK | 游戏局唯一标识 |
| `fingerprint` | TEXT | 玩家设备指纹 |
| `user_id` | TEXT | 玩家 ID，可为空字符串 |
| `sequence_plan_id` | UUID / TEXT FK | 本局所属玩法方案 |
| `generated_sequence_id` | UUID / TEXT FK | 本局实际使用的预生成序列 |
| `score` | INTEGER | 最终得分 |
| `actions_count` | INTEGER | 本局操作数 |
| `status` | TEXT | 状态，如 `playing` / `finished` |
| `end_reason` | TEXT | 结束原因 |
| `created_at` | DATETIME | 开局时间 |
| `ended_at` | DATETIME | 结束时间 |
| `last_update_at` | DATETIME | 最后更新时间 |

### 6. `scores`

存储排行榜结果，可由 `games` 表中的已结束对局汇总生成，也可单独冗余存储。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK / AUTOINCREMENT | 排行记录主键 |
| `game_id` | UUID / TEXT FK | 对应游戏局 |
| `fingerprint` | TEXT | 玩家设备指纹 |
| `score` | INTEGER | 最终得分 |
| `actions_count` | INTEGER | 本局操作数 |
| `created_at` | DATETIME | 记录创建时间 |

## 关系总结

- 一个 `sequence_plan` 可以包含多个 `stage`
- 一个 `stage` 可以被多个 `sequence_plan` 复用
- 一个 `sequence_plan` 可以生成多条 `generated_sequence`
- 一条 `generated_sequence` 可以被多个玩家重复体验
- 一个 `game` 关联一条 `sequence_plan` 和一条 `generated_sequence`
- 一个 `generated_sequence` 可以对应多条 `game` 记录
- `scores` 用于记录或汇总已结束对局结果
- 每局开局时，从某个 `sequence_plan` 下取一条状态为 `enabled` 的 `generated_sequence`
