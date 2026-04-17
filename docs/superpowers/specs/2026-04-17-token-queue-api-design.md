# Token Queue API Design

## Summary

Replace the current "start-game returns full 70-token sequence" model with a progressive token queue. The frontend fetches tokens in small batches (3 at a time) and maintains a local queue. This prevents the frontend from seeing the full sequence, improving anti-cheat.

## Current Flow (to be replaced)

```
POST /api/start-game → { gameId, sign, sequence[70] }
```

Frontend receives the entire sequence upfront, processes tokens locally.

## New Flow

### API Changes

**`POST /api/start-game`** (modified)

Request: `{ fingerprint, userId? }`

Response:
```json
{
  "gameId": "g_xxx",
  "sign": "abc123",
  "sequencePlanId": "uuid",
  "generatedSequenceId": "uuid",
  "tokens": ["2", "4", "8"]
}
```

- Returns the first 3 tokens from the sequence
- Backend stores `sequence_index = 3` on the game record (tracks how far into the sequence this game has consumed)
- No longer returns the full `sequence` field

**`POST /api/next-token`** (new)

Request: `{ gameId }`

Response:
```json
{
  "tokens": ["stone", "2", "8"]
}
```

- Returns the next 3 tokens from the sequence starting at the game's current `sequence_index`
- Updates `sequence_index += 3` on the game record
- If fewer than 3 tokens remain, returns whatever is left
- If no tokens remain, returns `{ "tokens": [] }` (signals sequence exhausted)

### Database Changes

Add column to `games` table:
```sql
ALTER TABLE games ADD COLUMN sequence_index INTEGER NOT NULL DEFAULT 0;
```

Backend reads from `generated_sequences.sequence_data` at the stored index position to serve the next batch.

### Frontend Changes

**TokenQueue (new module: `src/systems/TokenQueue.ts`)**

Responsibilities:
- Maintains a local array of tokens fetched from backend
- Tracks current position in the local queue
- Calls `/api/next-token` to refill when candy count drops below 3
- Provides methods: `getCurrentCandy()`, `getNextCandy()`, `advance()`

**Queue consumption logic:**

```
Queue: [2, 4, 8, stone, 2, 8, 4, 16...]

Sling displays curr + next, both are CANDIES (skip stones for display):
  curr = queue[0] = 2
  next = first candy after curr = 4

User shoots curr (2):
  - Pop 2 from queue
  - New curr = 4, new next = 8

User shoots curr (4):
  - Pop 4 from queue
  - New curr = 8
  - Look ahead: after 8 is "stone" → next candy = 2
  - Display: curr=8, next=2

User shoots curr (8):
  - Pop 8 from queue
  - Next in queue is "stone" → generate stone on board → pop stone
  - New curr = 2, new next = 8
  - Queue candy count < 3 → call POST /api/next-token to refill
```

**Refill trigger:**
- After each `advance()`, count remaining candies (non-stone tokens) in queue
- If < 3 candies remaining, call `/api/next-token` asynchronously
- Refill is non-blocking; game continues with existing queue while waiting

**Stone handling:**
- Stones are NOT displayed on the sling
- When the token at front of queue is "stone" after a shoot, it triggers stone spawn on the board
- Multiple consecutive stones are all processed before the next candy loads to sling

### Files to Modify

**Backend (`workers/src/index.ts`):**
- Modify `/api/start-game`: return only first 3 tokens, store `sequence_index`
- Add `/api/next-token`: serve next 3 tokens, advance index

**Backend (`workers/schema.sql`, `workers/seed.sql`):**
- Add `sequence_index` column to games table

**Frontend (`src/systems/TokenQueue.ts`):** NEW
- Token queue management, API calls, refill logic

**Frontend (`src/systems/ActionRecorder.ts`):**
- Remove sequence storage and consumption logic
- Delegate token management to TokenQueue

**Frontend (`src/scenes/GameScene.ts`):**
- Replace `this.recorder.prepareInitialCandies()` with TokenQueue initialization
- Replace `this.recorder.advanceAfterShot()` with TokenQueue advance
- Stone spawn triggered by TokenQueue when stones are encountered

**Frontend (`src/utils/api.ts`):**
- Remove `sequence` from `StartGameResponse`
- Add `tokens` field to `StartGameResponse`
- Add `nextToken(gameId)` function

### Edge Cases

- **Sequence exhausted**: `/api/next-token` returns empty `tokens[]` → game over
- **Network error on refill**: Game continues with remaining queue; retry on next advance
- **All remaining tokens are stones**: Process all stones, then check if queue is empty → game over or refill
- **Concurrent refill requests**: Frontend should debounce; only one inflight `/api/next-token` at a time

### Security

- Backend controls token distribution; frontend never sees tokens beyond current batch
- Backend validates `sequence_index` is monotonically increasing (no replay)
- Sign chain continues to work as before for action verification
