# Token Queue API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-shot sequence download with progressive token fetching (3 tokens per request) so the frontend never sees the full sequence.

**Architecture:** Backend adds `sequence_index` to games table and a new `/api/next-token` endpoint. Frontend replaces ActionRecorder's sequence logic with a new TokenQueue class that maintains a local buffer and auto-refills from the API.

**Tech Stack:** TypeScript, Cloudflare Workers (D1), Phaser 4, Vite

---

### Task 1: Backend — Add `sequence_index` column and helper function

**Files:**
- Modify: `workers/src/index.ts:100-127` (getPlayableSequence, add sliceTokens helper)
- Modify: `workers/schema.sql` (add column)

- [ ] **Step 1: Add sequence_index to schema.sql**

Add after the `generated_sequence_id` column in the games table definition:

```sql
-- In the CREATE TABLE games block, add:
  sequence_index INTEGER NOT NULL DEFAULT 0,
```

- [ ] **Step 2: Run migration on local D1**

```bash
cd workers
npx wrangler d1 execute giant-2048-scores --local --command "ALTER TABLE games ADD COLUMN sequence_index INTEGER NOT NULL DEFAULT 0;"
```

Expected: success

- [ ] **Step 3: Add sliceTokens helper in index.ts**

Add after the `generateGameId()` function (after line 52):

```typescript
function sliceTokens(
  sequenceData: string,
  startIndex: number,
  count: number
): { tokens: SequenceToken[]; newIndex: number } {
  const allTokens = JSON.parse(sequenceData) as Array<string | number>;
  const end = Math.min(startIndex + count, allTokens.length);
  const tokens = allTokens.slice(startIndex, end).map(t => String(t) as SequenceToken);
  return { tokens, newIndex: end };
}
```

- [ ] **Step 4: Commit**

```bash
git add workers/src/index.ts workers/schema.sql
git commit -m "feat: add sequence_index column and sliceTokens helper"
```

---

### Task 2: Backend — Modify `/api/start-game` to return only first 3 tokens

**Files:**
- Modify: `workers/src/index.ts:139-183`

- [ ] **Step 1: Replace the start-game handler**

Replace lines 139-183 with:

```typescript
      if (url.pathname === '/api/start-game' && request.method === 'POST') {
        const { fingerprint, userId } = await request.json() as { fingerprint: string; userId?: string };
        if (!fingerprint) return jsonResponse({ error: 'Missing fingerprint' }, 400);

        // 同一指纹的旧局自动结束
        await env.DB.prepare(
          "UPDATE games SET status = 'finished', end_reason = 'new_game', ended_at = ? WHERE fingerprint = ? AND status = 'playing'"
        ).bind(new Date().toISOString(), fingerprint).run();

        const gameId = generateGameId();
        const seed = Math.floor(Math.random() * 2147483647);
        const now = new Date().toISOString();
        const sign = await initSign(gameId);
        const { sequencePlanId, generatedSequenceId } = await getPlayableSequence(env);

        // Get the generated sequence data for slicing
        const genSeq = await env.DB.prepare(
          'SELECT sequence_data FROM generated_sequences WHERE id = ?'
        ).bind(generatedSequenceId).first() as Record<string, unknown>;
        const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, 0, 3);

        await env.DB.prepare(
          `INSERT INTO games
           (game_id, fingerprint, user_id, seed, step, score, sign, status,
            sequence_plan_id, generated_sequence_id, sequence_index,
            end_reason, ended_at, last_update_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          gameId, fingerprint, userId || '', seed, 0, 0, sign, 'playing',
          sequencePlanId, generatedSequenceId, newIndex,
          '', '', now, now,
        ).run();

        return jsonResponse({
          gameId,
          tokens,
          sequencePlanId,
          generatedSequenceId,
          sign,
        });
      }
```

- [ ] **Step 2: Modify getPlayableSequence to not return full sequence**

Replace the `getPlayableSequence` function (lines 100-127) — it no longer needs to return the sequence array, only the IDs:

```typescript
async function getPlayableSequence(env: Env): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
}> {
  const generated = await env.DB.prepare(
    `SELECT id, sequence_plan_id
     FROM generated_sequences
     WHERE status = 'enabled'
     ORDER BY RANDOM()
     LIMIT 1`
  ).first() as Record<string, unknown> | null;

  if (generated) {
    return {
      generatedSequenceId: generated.id as string,
      sequencePlanId: generated.sequence_plan_id as string,
    };
  }

  const created = await createGeneratedSequenceFromRandomPlan(env);
  if (!created) {
    throw new Error('No enabled generated sequence and no sequence plan available');
  }
  return {
    generatedSequenceId: created.generatedSequenceId,
    sequencePlanId: created.sequencePlanId,
  };
}
```

- [ ] **Step 3: Test start-game locally**

```bash
curl -s http://localhost:8787/api/start-game -X POST \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"test_plan"}' | python3 -m json.tool
```

Expected: response has `tokens` array with 3 items, NO `sequence` field.

- [ ] **Step 4: Commit**

```bash
git add workers/src/index.ts
git commit -m "feat: start-game returns only first 3 tokens"
```

---

### Task 3: Backend — Add `/api/next-token` endpoint

**Files:**
- Modify: `workers/src/index.ts` (add after the deprecated extend-sequence block, ~line 188)

- [ ] **Step 1: Add the next-token handler**

Insert after the extend-sequence block:

```typescript
      // ===== 取下一批 token =====
      if (url.pathname === '/api/next-token' && request.method === 'POST') {
        const { gameId } = await request.json() as { gameId: string };
        if (!gameId) return jsonResponse({ error: 'Missing gameId' }, 400);

        const game = await env.DB.prepare(
          'SELECT game_id, status, generated_sequence_id, sequence_index FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game finished' }, 400);

        const genSeq = await env.DB.prepare(
          'SELECT sequence_data FROM generated_sequences WHERE id = ?'
        ).bind(game.generated_sequence_id as string).first() as Record<string, unknown>;

        if (!genSeq) return jsonResponse({ error: 'Sequence not found' }, 500);

        const currentIndex = game.sequence_index as number;
        const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, currentIndex, 3);

        await env.DB.prepare(
          'UPDATE games SET sequence_index = ?, last_update_at = ? WHERE game_id = ?'
        ).bind(newIndex, new Date().toISOString(), gameId).run();

        return jsonResponse({ tokens });
      }
```

- [ ] **Step 2: Test next-token locally**

First start a game, then request tokens:

```bash
# Start game
GAME_ID=$(curl -s http://localhost:8787/api/start-game -X POST \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"test_next"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['gameId'])")

echo "Game: $GAME_ID"

# Get next tokens
curl -s http://localhost:8787/api/next-token -X POST \
  -H "Content-Type: application/json" \
  -d "{\"gameId\":\"$GAME_ID\"}" | python3 -m json.tool
```

Expected: returns `{ "tokens": ["...", "...", "..."] }` with tokens 4-6 from the sequence.

- [ ] **Step 3: Commit**

```bash
git add workers/src/index.ts
git commit -m "feat: add /api/next-token endpoint"
```

---

### Task 4: Frontend — Add `nextToken` to api.ts and update types

**Files:**
- Modify: `src/utils/api.ts`

- [ ] **Step 1: Update StartGameResponse and add nextToken function**

Replace `StartGameResponse` interface and add `nextToken`:

```typescript
interface StartGameResponse {
  gameId: string;
  tokens: SequenceToken[];
  sequencePlanId: string;
  generatedSequenceId: string;
  sign: string;
}

interface NextTokenResponse {
  tokens: SequenceToken[];
}
```

Add after the `startGame` function:

```typescript
// 补充 token：每次取 3 个
export async function nextToken(gameId: string): Promise<NextTokenResponse> {
  return post<NextTokenResponse>('/api/next-token', { gameId });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/api.ts
git commit -m "feat: add nextToken API and update StartGameResponse type"
```

---

### Task 5: Frontend — Create TokenQueue class

**Files:**
- Create: `src/systems/TokenQueue.ts`

- [ ] **Step 1: Create TokenQueue.ts**

```typescript
import { nextToken, SequenceToken } from '../utils/api';

/**
 * 管理从后端逐步获取的 token 队列。
 * 弹弓显示 curr + next（都是糖果），stone 在轮到时生成在棋盘上。
 */
export class TokenQueue {
  private queue: SequenceToken[] = [];
  private gameId: string = '';
  private fetching: boolean = false;
  private exhausted: boolean = false;

  init(gameId: string, initialTokens: SequenceToken[]): void {
    this.gameId = gameId;
    this.queue = [...initialTokens];
    this.fetching = false;
    this.exhausted = false;
  }

  /**
   * 从队列中取出 curr 和 next 糖果（跳过 stone 用于显示，但 stone 保留在队列中）。
   * 返回前两个糖果值，用于弹弓显示。
   */
  peekCandies(): { currentCandy: number; nextCandy: number | null } | null {
    const candies: number[] = [];
    for (const token of this.queue) {
      if (token !== 'stone') {
        candies.push(parseInt(token, 10));
        if (candies.length === 2) break;
      }
    }
    if (candies.length === 0) return null;
    return {
      currentCandy: candies[0],
      nextCandy: candies.length > 1 ? candies[1] : null,
    };
  }

  /**
   * 用户打出当前糖果后调用。
   * 弹出队列前端直到弹出一个糖果，中间遇到的 stone 收集返回。
   * 然后检查是否需要补充。
   */
  advance(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    // 弹出第一个糖果（已经被用户打出了）
    this.consumeNextCandy(onStone);

    // 现在 peek 新的 curr + next
    const result = this.peekCandies();

    // 检查补充
    this.maybeRefill();

    return result;
  }

  /**
   * 初始化时调用：消费队列直到找到两个糖果，中间的 stone 触发 onStone。
   */
  prepareInitial(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    // 先处理队列前面可能的 stone
    this.processLeadingStones(onStone);

    const result = this.peekCandies();
    this.maybeRefill();
    return result;
  }

  /**
   * 从队列前端消费一个糖果。中间遇到的 stone 调用 onStone。
   */
  private consumeNextCandy(onStone: () => void): number | null {
    while (this.queue.length > 0) {
      const token = this.queue.shift()!;
      if (token === 'stone') {
        console.log('[TokenQueue] stone encountered, spawning');
        onStone();
        continue;
      }
      const value = parseInt(token, 10);
      if (Number.isFinite(value)) {
        console.log(`[TokenQueue] consumed candy ${value}`);
        return value;
      }
      console.warn(`[TokenQueue] invalid token ignored: ${token}`);
    }
    return null;
  }

  /**
   * 处理队列前面连续的 stone（初始化时用）。
   */
  private processLeadingStones(onStone: () => void): void {
    while (this.queue.length > 0 && this.queue[0] === 'stone') {
      this.queue.shift();
      console.log('[TokenQueue] leading stone, spawning');
      onStone();
    }
  }

  /**
   * 计算队列中剩余糖果数，不足 3 个时异步补充。
   */
  private maybeRefill(): void {
    if (this.fetching || this.exhausted) return;

    const candyCount = this.queue.filter(t => t !== 'stone').length;
    if (candyCount < 3) {
      this.refill();
    }
  }

  private async refill(): Promise<void> {
    if (this.fetching || this.exhausted) return;
    this.fetching = true;

    try {
      console.log('[TokenQueue] refilling...');
      const result = await nextToken(this.gameId);
      if (result.tokens.length === 0) {
        this.exhausted = true;
        console.log('[TokenQueue] sequence exhausted');
      } else {
        this.queue.push(...result.tokens);
        console.log(`[TokenQueue] refilled ${result.tokens.length} tokens, queue size=${this.queue.length}`);
      }
    } catch (e) {
      console.error('[TokenQueue] refill failed:', e);
    } finally {
      this.fetching = false;
    }
  }

  isExhausted(): boolean {
    return this.exhausted && this.queue.length === 0;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/TokenQueue.ts
git commit -m "feat: add TokenQueue class for progressive token fetching"
```

---

### Task 6: Frontend — Refactor ActionRecorder to remove sequence logic

**Files:**
- Modify: `src/systems/ActionRecorder.ts`

- [ ] **Step 1: Strip sequence management from ActionRecorder**

Replace entire file content:

```typescript
import { getFingerprint } from '../utils/fingerprint';
import { startGame, sendAction, updateScore, endGame, SequenceToken } from '../utils/api';
import { TokenQueue } from './TokenQueue';

// 和后端通信的局级记录器 + token 队列管理。
export class ActionRecorder {
  private gameId: string = '';
  private currentSign: string = '';
  private ready: boolean = false;
  private userId: string = '';
  private sequencePlanId: string = '';
  private generatedSequenceId: string = '';
  private actionsCount: number = 0;

  public tokenQueue: TokenQueue = new TokenQueue();

  async init(userId?: string): Promise<void> {
    this.userId = userId || '';
    const fingerprint = await getFingerprint();
    console.log('[ActionRecorder] fingerprint:', fingerprint.slice(0, 16) + '...');

    const result = await startGame(fingerprint, this.userId);
    this.gameId = result.gameId;
    this.currentSign = result.sign;
    this.sequencePlanId = result.sequencePlanId;
    this.generatedSequenceId = result.generatedSequenceId;
    this.actionsCount = 0;

    this.tokenQueue.init(this.gameId, result.tokens);
    this.ready = true;

    console.log(
      `[ActionRecorder] gameId=${this.gameId}, plan=${this.sequencePlanId}, ` +
      `generatedSequence=${this.generatedSequenceId}, initial tokens=${result.tokens.length}`
    );
  }

  prepareInitialCandies(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    if (!this.ready) return null;
    return this.tokenQueue.prepareInitial(onStone);
  }

  advanceAfterShot(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    if (!this.ready) return null;
    return this.tokenQueue.advance(onStone);
  }

  async recordShoot(col: number, value: number): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(`[ActionRecorder] local shoot col=${col} value=${value}, actions=${this.actionsCount}`);
    try {
      const result = await sendAction(this.gameId, { type: 'shoot', col, value });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] shoot failed:', e);
    }
  }

  async recordRotate(direction: 'cw' | 'ccw'): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(`[ActionRecorder] local rotate direction=${direction}, actions=${this.actionsCount}`);
    try {
      const result = await sendAction(this.gameId, { type: 'rotate', direction });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] rotate failed:', e);
    }
  }

  async recordDirectMerge(col: number, value: number, resultValue: number): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(
      `[ActionRecorder] local direct_merge col=${col} value=${value} -> ${resultValue}, actions=${this.actionsCount}`
    );
    try {
      const result = await sendAction(this.gameId, {
        type: 'direct_merge', col, value, resultValue,
      });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] direct_merge failed:', e);
    }
  }

  async reportScore(score: number): Promise<void> {
    if (!this.ready) return;
    try {
      await updateScore({ gameId: this.gameId, score });
    } catch (e) {
      console.error('[ActionRecorder] updateScore failed:', e);
    }
  }

  async finish(finalScore: number, endReason?: string): Promise<{ rank: number } | null> {
    if (!this.ready) return null;
    try {
      const result = await endGame({
        gameId: this.gameId,
        finalSign: this.currentSign,
        finalScore,
        endReason,
      });
      console.log(
        `[ActionRecorder] game submitted, reason=${endReason || 'gameover'}, ` +
        `score=${result.score}, rank=${result.rank}`
      );
      return { rank: result.rank };
    } catch (e) {
      console.error('[ActionRecorder] submitGame failed:', e);
      return null;
    }
  }

  getGameId(): string { return this.gameId; }
  getSign(): string { return this.currentSign; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/ActionRecorder.ts
git commit -m "refactor: ActionRecorder delegates token management to TokenQueue"
```

---

### Task 7: Frontend — Update GameScene to use new token flow

**Files:**
- Modify: `src/scenes/GameScene.ts:591-711`

- [ ] **Step 1: Update initBackend — no changes needed**

The `initBackend` method already calls `this.recorder.prepareInitialCandies()` and `this.recorder.advanceAfterShot()`, which are now delegated to TokenQueue. The interface is the same, so **GameScene.ts requires no code changes**.

- [ ] **Step 2: Verify respawnWithSequence still works**

`respawnWithSequence()` at line 697 calls `this.recorder.advanceAfterShot(() => this.spawnStone())`. The new ActionRecorder delegates this to `tokenQueue.advance(onStone)` which has the same return type. No changes needed.

- [ ] **Step 3: Build and type-check**

```bash
cd /Users/yibu/dev_workspace/github.com/2048/2048_Phaser3
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Build for production**

```bash
npm run build
```

Expected: success

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete token queue integration — progressive token fetching"
```

---

### Task 8: Test end-to-end locally

**Files:** none (testing only)

- [ ] **Step 1: Restart wrangler dev**

```bash
cd workers
kill $(lsof -ti:8787) 2>/dev/null
npx wrangler dev --port 8787 &
sleep 5
```

- [ ] **Step 2: Run local D1 migration**

```bash
npx wrangler d1 execute giant-2048-scores --local \
  --command "ALTER TABLE games ADD COLUMN sequence_index INTEGER NOT NULL DEFAULT 0;"
```

- [ ] **Step 3: Test start-game returns 3 tokens**

```bash
curl -s http://localhost:8787/api/start-game -X POST \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"e2e_test"}' | python3 -m json.tool
```

Verify: response has `tokens` (array of 3), no `sequence` field.

- [ ] **Step 4: Test next-token returns next batch**

```bash
# Use gameId from previous step
curl -s http://localhost:8787/api/next-token -X POST \
  -H "Content-Type: application/json" \
  -d '{"gameId":"<gameId_from_step_3>"}' | python3 -m json.tool
```

Verify: returns `tokens` array with next 3 tokens.

- [ ] **Step 5: Open browser and play a game**

Open http://localhost:7001, start a game, shoot a few candies. Check browser console for:
- `[TokenQueue] refilling...`
- `[TokenQueue] refilled 3 tokens`
- `[TokenQueue] consumed candy X`
- Stone spawning when stone token is reached

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "test: verify token queue end-to-end"
```

---

### Task 9: Deploy to production

- [ ] **Step 1: Run production D1 migration**

```bash
cd workers
npx wrangler d1 execute giant-2048-scores --remote \
  --command "ALTER TABLE games ADD COLUMN sequence_index INTEGER NOT NULL DEFAULT 0;"
```

- [ ] **Step 2: Deploy Workers**

```bash
npx wrangler deploy
```

- [ ] **Step 3: Build and deploy frontend**

```bash
cd ..
npm run build
npx wrangler pages deploy dist --project-name giant-2048
```

- [ ] **Step 4: Test production**

Open https://giant-2048.pages.dev, start a game, verify it works.
