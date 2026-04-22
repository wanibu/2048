// 后端响应类型

export interface PaginatedResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Stats {
  totalGames: number;
  playingGames: number;
  finishedGames: number;
  topScore: number;
  uniquePlayers: number;
  sequencePlans: number;
  generatedSequences: number;
}

export interface Game {
  game_id: string;
  fingerprint: string;
  user_id: string | null;
  seed: number;
  step: number;
  score: number;
  sign: string;
  status: 'playing' | 'finished';
  sequence_plan_id: string | null;
  generated_sequence_id: string | null;
  sequence_index: number;
  end_reason: string | null;
  ended_at: string | null;
  last_update_at: string | null;
  created_at: string;
  // joined / enriched
  plan_name?: string | null;
  sequence_length?: number;
}

export interface GameDetail extends Game {
  plan_name: string | null;
  sequence: string | null;
  sequence_length: number;
  stages: Array<{
    id: string;
    name: string;
    length: number;
    stage_order: number;
    probabilities: Record<string, number>;
  }>;
}
export interface GamesResp extends PaginatedResponse {
  games: Game[];
}

// Plan 内联 stage（每个 stage 只属于一个 plan）
export interface PlanStage {
  id: string;
  name: string;
  length: number;
  probabilities: Record<string, number>;
  stage_order: number;
}
export interface Plan {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  stages: PlanStage[];
  total_length: number;
}
export interface PlansResp extends PaginatedResponse {
  plans: Plan[];
}

// 创建/更新 Plan 时提交的 inline stage
export interface InlineStageInput {
  name: string;
  length: number;
  probabilities: Record<string, number>;
  stage_order: number;
}

export interface GeneratedSequence {
  id: string;
  sequence_plan_id: string;
  plan_name: string | null;
  sequence_data: Array<string | number>;
  sequence_length: number;
  status: 'enabled' | 'disabled';
  created_at: string;
  updated_at: string;
}
export interface SequencesResp extends PaginatedResponse {
  sequences: GeneratedSequence[];
}

export interface NumStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  p90: number | null;
  std: number | null;
  cv: number | null;
}

export interface PlanStat {
  plan_id: string | null;
  plan_name: string | null;
  games_total: number;
  games_finished: number;
  games_playing: number;
  unique_players: number;
  score: NumStats;
  duration_sec: NumStats;
  step: NumStats;
  end_reasons: Record<string, number>;
  ceiling_ratio: number | null;
  gameover_share: number | null;
  timeout_share: number | null;
  first_game: {
    count: number;
    avg_step: number | null;
    avg_score: number | null;
  };
  retry_rate: number | null;
  learning_curve: {
    sample: number;
    avg_delta: number | null;
  };
}

export interface PlanStatsResp {
  plans: PlanStat[];
}

export interface SequenceStat {
  sequence_id: string;
  games_total: number;
  games_finished: number;
  unique_players: number;
  score_min: number | null;
  score_max: number | null;
  score_avg: number | null;
  score_median: number | null;
  duration_avg: number | null;
  duration_median: number | null;
}

export interface PlanSequenceStatsResp {
  plan_id: string;
  sequences: SequenceStat[];
}
