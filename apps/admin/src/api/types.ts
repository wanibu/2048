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
  end_reason: string | null;
  ended_at: string | null;
  last_update_at: string | null;
  created_at: string;
}
export interface GamesResp extends PaginatedResponse {
  games: Game[];
}

export interface Stage {
  id: string;
  name: string;
  length: number;
  probabilities: Record<string, number>;
  created_at: string;
  updated_at: string;
}
export interface StagesResp extends PaginatedResponse {
  stages: Stage[];
}

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
