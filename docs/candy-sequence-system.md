# 预生成序列测试系统

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

## 关系总结

- 一个 `sequence_plan` 可以包含多个 `stage`
- 一个 `stage` 可以被多个 `sequence_plan` 复用
- 一个 `sequence_plan` 可以生成多条 `generated_sequence`
- 一条 `generated_sequence` 可以被多个玩家重复体验
- 每局开局时，从某个 `sequence_plan` 下取一条状态为 `enabled` 的 `generated_sequence`
