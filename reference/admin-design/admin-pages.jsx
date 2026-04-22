// admin-pages.jsx — Stats / PlanAnalysis / Games / GameDetail pages.
// Hosted inside AdminShell2 (see admin-app.jsx). Read-only production-flavored
// views, matching the muted admin aesthetic established in plan-detail-views.

// ────────────────────────────────────────────────────────────────
// Shared data
// ────────────────────────────────────────────────────────────────
const STATS = {
  totalGames: 12847,
  playingGames: 38,
  finishedGames: 12809,
  topScore: 108240,
  uniquePlayers: 4216,
  sequencePlans: 7,
  generatedSequences: 42,
};

const PLAN_STATS = [
  { id: 'bdbe684e-681c-4452-b5a6-291b55f79928', name: 'planA',      seq_count: 4, unique: 1127, games: 3840, score_min: 120,  score_max: 18240, score_avg: 2140, score_med: 1820, dur_avg: 148, dur_med: 142 },
  { id: '7a210ff8-c42e-4812-a6c0-5514f88b0a12', name: 'planB',      seq_count: 6, unique: 992,  games: 2984, score_min: 180,  score_max: 21400, score_avg: 2420, score_med: 2140, dur_avg: 174, dur_med: 168 },
  { id: 'c8014802-4284-4f00-8110-9a012de8fe41', name: 'planC',      seq_count: 2, unique: 612,  games: 1720, score_min: 60,   score_max: 8420,  score_avg: 820,  score_med: 680,  dur_avg: 94,  dur_med: 88 },
  { id: 'f20e1184-3124-44a8-b204-018a26ee9c12', name: 'planD-hard', seq_count: 3, unique: 448,  games: 1204, score_min: 320,  score_max: 24800, score_avg: 4120, score_med: 3840, dur_avg: 218, dur_med: 212 },
  { id: '44128e08-9ac0-4b16-8820-f0a2be11d048', name: 'planE-easy', seq_count: 5, unique: 734,  games: 2118, score_min: 40,   score_max: 3240,  score_avg: 480,  score_med: 420,  dur_avg: 68,  dur_med: 64 },
  { id: 'aa48e24a-1108-4208-9c80-22e1ff012a14', name: 'planF-test', seq_count: 1, unique: 186,  games: 548,  score_min: 160,  score_max: 9280,  score_avg: 2060, score_med: 1980, dur_avg: 162, dur_med: 156 },
  { id: '19c84480-72c0-4a28-b144-5ee0a212cc08', name: 'planG-v2',   seq_count: 2, unique: 142,  games: 433,  score_min: 220,  score_max: 11400, score_avg: 2360, score_med: 2280, dur_avg: 178, dur_med: 172 },
];

const PLAN_SEQ_STATS = {
  'bdbe684e-681c-4452-b5a6-291b55f79928': [
    { id: '34025f32-a2c1-4da8', name: 'planA_seq_1a8f', displayName: 'planA版本1', games: 1420, unique: 480, score_min: 120,  score_max: 8960,  score_avg: 1920, score_med: 1780, dur_avg: 138, dur_med: 132 },
    { id: '92e9a3d4-b018-4c22', name: 'planA_seq_9e21', displayName: 'planA版本2', games: 1180, unique: 396, score_min: 240,  score_max: 10240, score_avg: 2040, score_med: 1890, dur_avg: 152, dur_med: 146 },
    { id: '31d10fb0-c410-4e88', name: 'planA_seq_7c4d', displayName: 'planA版本3', games: 820,  unique: 261, score_min: 80,   score_max: 6420,  score_avg: 1640, score_med: 1520, dur_avg: 128, dur_med: 122 },
    { id: '8640e23a-4a20-4c00', name: 'planA_seq_2f06', displayName: 'planA版本4', games: 420,  unique: 148, score_min: 160,  score_max: 5820,  score_avg: 1780, score_med: 1640, dur_avg: 142, dur_med: 138 },
  ],
  '7a210ff8-c42e-4812-a6c0-5514f88b0a12': [
    { id: 'a12fe842-b004-4122', name: 'planB_seq_4b81', displayName: 'planB版本1', games: 1620, unique: 540, score_min: 180, score_max: 11200, score_avg: 2280, score_med: 2080, dur_avg: 172, dur_med: 164 },
    { id: 'b73ff9c2-0880-4e22', name: 'planB_seq_c091', displayName: 'planB版本2', games: 1364, unique: 452, score_min: 220, score_max: 9840,  score_avg: 2040, score_med: 1940, dur_avg: 168, dur_med: 160 },
  ],
};

const SEQUENCE_ANALYSIS_DETAILS = {
  '34025f32-a2c1-4da8': {
    headline: '主分发版本，在线玩家最多，整体表现稳定。',
    summary: '这是 planA 当前覆盖面最大的序列 ID。平均得分和中位数都比较稳，当前在线玩家也最多，适合作为默认分发版本持续观察。',
    focus: '重点看在线玩家规模和 GAMEOVER 占比，确认它是否仍然是最稳的基线版本。',
    playingPlayers: 28,
    playingGames: 36,
    todayPlayers: 64,
    hourGames: 12,
    finishedGames: 1384,
    avgStep: 72,
    medStep: 68,
    status: 'enabled',
    createdAt: '2026-04-21 18:22:08',
    endReasons: [
      { key: 'gameover', label: 'GAMEOVER', count: 1020, color: '#c83a3a' },
      { key: 'timeout', label: 'TIMEOUT', count: 214, color: '#ffb93c' },
      { key: 'user_quit', label: 'USER_QUIT', count: 126, color: '#8a8a94' },
      { key: 'force_deleted', label: 'FORCE_DELETED', count: 42, color: '#c14dff' },
      { key: 'unknown', label: 'UNKNOWN', count: 18, color: '#c6c6cc' },
    ],
    recentGames: [
      { gameId: 'g_a1f0_3921', fp: 'fp_91a72…', status: 'playing', score: 1840, step: 56, dur: '136s', updatedAt: '18:24:17' },
      { gameId: 'g_a1f0_38fd', fp: 'fp_18c02…', status: 'playing', score: 1260, step: 41, dur: '92s', updatedAt: '18:23:50' },
      { gameId: 'g_a1f0_38da', fp: 'fp_11f9a…', status: 'finished', score: 2480, step: 74, dur: '148s', updatedAt: '18:22:44' },
      { gameId: 'g_a1f0_38b1', fp: 'fp_04ac8…', status: 'finished', score: 1720, step: 62, dur: '131s', updatedAt: '18:21:20' },
    ],
  },
  '92e9a3d4-b018-4c22': {
    headline: '高表现版本，平均分和时长都更高。',
    summary: '这条序列的整体成绩优于版本1，平均分、中位数和平均时长都更高，说明它更可能把玩家送进更深的局面。',
    focus: '重点观察它是否值得继续放量，以及高分表现是否来自更长的有效对局。',
    playingPlayers: 19,
    playingGames: 24,
    todayPlayers: 51,
    hourGames: 8,
    finishedGames: 1156,
    avgStep: 78,
    medStep: 74,
    status: 'enabled',
    createdAt: '2026-04-21 18:25:14',
    endReasons: [
      { key: 'gameover', label: 'GAMEOVER', count: 812, color: '#c83a3a' },
      { key: 'timeout', label: 'TIMEOUT', count: 196, color: '#ffb93c' },
      { key: 'user_quit', label: 'USER_QUIT', count: 112, color: '#8a8a94' },
      { key: 'force_deleted', label: 'FORCE_DELETED', count: 36, color: '#c14dff' },
      { key: 'unknown', label: 'UNKNOWN', count: 24, color: '#c6c6cc' },
    ],
    recentGames: [
      { gameId: 'g_9e21_3321', fp: 'fp_43de1…', status: 'playing', score: 2120, step: 63, dur: '144s', updatedAt: '18:24:02' },
      { gameId: 'g_9e21_3308', fp: 'fp_72fb2…', status: 'playing', score: 980, step: 36, dur: '84s', updatedAt: '18:23:18' },
      { gameId: 'g_9e21_32fa', fp: 'fp_6bc10…', status: 'finished', score: 3240, step: 82, dur: '166s', updatedAt: '18:22:16' },
      { gameId: 'g_9e21_32d4', fp: 'fp_992ac…', status: 'finished', score: 1880, step: 58, dur: '134s', updatedAt: '18:20:48' },
    ],
  },
  '31d10fb0-c410-4e88': {
    headline: '偏弱版本，得分和步数都明显落后。',
    summary: '这条序列是 planA 四个版本里表现最弱的一条。平均得分、平均步数和在线规模都偏低，更像需要复盘的对照样本。',
    focus: '重点看它是否过早 gameover，或者是否需要直接下线停止继续分发。',
    playingPlayers: 11,
    playingGames: 15,
    todayPlayers: 28,
    hourGames: 4,
    finishedGames: 805,
    avgStep: 61,
    medStep: 56,
    status: 'disabled',
    createdAt: '2026-04-21 18:28:40',
    endReasons: [
      { key: 'gameover', label: 'GAMEOVER', count: 614, color: '#c83a3a' },
      { key: 'timeout', label: 'TIMEOUT', count: 92, color: '#ffb93c' },
      { key: 'user_quit', label: 'USER_QUIT', count: 74, color: '#8a8a94' },
      { key: 'force_deleted', label: 'FORCE_DELETED', count: 24, color: '#c14dff' },
      { key: 'unknown', label: 'UNKNOWN', count: 16, color: '#c6c6cc' },
    ],
    recentGames: [
      { gameId: 'g_7c4d_2810', fp: 'fp_84cc1…', status: 'playing', score: 820, step: 29, dur: '68s', updatedAt: '18:23:10' },
      { gameId: 'g_7c4d_27fd', fp: 'fp_4a211…', status: 'finished', score: 1560, step: 54, dur: '118s', updatedAt: '18:21:42' },
      { gameId: 'g_7c4d_27c8', fp: 'fp_31be0…', status: 'finished', score: 2040, step: 63, dur: '126s', updatedAt: '18:19:57' },
    ],
  },
  '8640e23a-4a20-4c00': {
    headline: '尾部分发版本，样本较小，表现中等。',
    summary: '这条序列的总体表现介于版本2和版本3之间，但样本规模更小，因此当前结论的稳定性相对弱一些。',
    focus: '重点看样本是否足够，以及它是否适合作为补充流量的备选版本。',
    playingPlayers: 7,
    playingGames: 9,
    todayPlayers: 16,
    hourGames: 3,
    finishedGames: 411,
    avgStep: 66,
    medStep: 62,
    status: 'disabled',
    createdAt: '2026-04-21 18:31:02',
    endReasons: [
      { key: 'gameover', label: 'GAMEOVER', count: 296, color: '#c83a3a' },
      { key: 'timeout', label: 'TIMEOUT', count: 71, color: '#ffb93c' },
      { key: 'user_quit', label: 'USER_QUIT', count: 38, color: '#8a8a94' },
      { key: 'force_deleted', label: 'FORCE_DELETED', count: 10, color: '#c14dff' },
      { key: 'unknown', label: 'UNKNOWN', count: 5, color: '#c6c6cc' },
    ],
    recentGames: [
      { gameId: 'g_2f06_1c22', fp: 'fp_a93cd…', status: 'playing', score: 960, step: 32, dur: '74s', updatedAt: '18:22:06' },
      { gameId: 'g_2f06_1c0f', fp: 'fp_0a712…', status: 'finished', score: 1840, step: 60, dur: '139s', updatedAt: '18:20:24' },
      { gameId: 'g_2f06_1bfc', fp: 'fp_44dc9…', status: 'finished', score: 1420, step: 52, dur: '121s', updatedAt: '18:18:54' },
    ],
  },
};

const END_REASONS = {
  overall: [
    { key: 'gameover', label: 'GAMEOVER', count: 9840, color: '#c83a3a' },
    { key: 'timeout', label: 'TIMEOUT', count: 1820, color: '#ffb93c' },
    { key: 'user_quit', label: 'USER_QUIT', count: 842, color: '#8a8a94' },
    { key: 'sequence_force_deleted', label: 'FORCE_DELETED', count: 306, color: '#c14dff' },
    { key: 'unknown', label: 'UNKNOWN', count: 39, color: '#c6c6cc' },
  ],
};

const GAMES = [
  { id: '3fa2e140-8c12-4a66', fp: 'fp_9ad2c…', plan: 'planB', status: 'playing',  score: 1240,  step: 38,  dur: 92,  created: '18:22:45' },
  { id: 'b41e8820-c0f8-491a', fp: 'fp_4ac12…', plan: 'planA', status: 'finished', score: 8840,  step: 124, dur: 268, created: '18:20:12' },
  { id: '81c0aa20-f4c8-4284', fp: 'fp_8f012…', plan: 'planA', status: 'finished', score: 12480, step: 148, dur: 312, created: '18:18:03' },
  { id: '72de3114-a220-4f08', fp: 'fp_22e01…', plan: 'planD-hard', status: 'finished', score: 4200, step: 78, dur: 186, created: '18:15:22' },
  { id: '05ee9124-c88c-48a0', fp: 'fp_9ad2c…', plan: 'planB', status: 'finished', score: 2140,  step: 62,  dur: 148, created: '18:13:10' },
  { id: '918c2230-0188-4a12', fp: 'fp_11f4a…', plan: 'planE-easy', status: 'finished', score: 280, step: 18, dur: 46, created: '18:11:04' },
  { id: 'd210eef8-a8c4-4290', fp: 'fp_0c812…', plan: 'planC', status: 'finished', score: 640,  step: 28,  dur: 82,  created: '18:08:48' },
  { id: 'fa0eec14-4ad0-4af2', fp: 'fp_4ac12…', plan: 'planA', status: 'finished', score: 6420, step: 112, dur: 234, created: '18:06:30' },
  { id: '4b09c120-1290-4c60', fp: 'fp_38d0e…', plan: 'planB', status: 'playing',  score: 820,  step: 24,  dur: 58,  created: '18:04:12' },
  { id: 'aa20ccd4-5a88-4e01', fp: 'fp_7e102…', plan: 'planG-v2', status: 'finished', score: 3820, step: 88, dur: 192, created: '18:01:28' },
  { id: '0219ec40-b2a0-46c8', fp: 'fp_8f012…', plan: 'planA', status: 'finished', score: 10240, step: 132, dur: 288, created: '17:58:14' },
  { id: '91eeaa08-c440-44d2', fp: 'fp_2212b…', plan: 'planF-test', status: 'finished', score: 1840, step: 68, dur: 156, created: '17:55:02' },
  { id: 'c8812e0c-0988-4b40', fp: 'fp_4ac12…', plan: 'planA', status: 'finished', score: 7140, step: 118, dur: 248, created: '17:52:40' },
  { id: '18a0ff02-e442-4812', fp: 'fp_99a12…', plan: 'planD-hard', status: 'finished', score: 5640, step: 98, dur: 218, created: '17:49:18' },
  { id: '2038c214-ba20-4f84', fp: 'fp_0c812…', plan: 'planC', status: 'finished', score: 420, step: 20, dur: 62, created: '17:46:50' },
];

const GAME_DETAIL = {
  id: '3fa2e140-8c12-4a66-9d04-1e7c83b99f02',
  fp: 'fp_9ad2c5f7e8b1',
  userId: '',
  seed: 1729516234,
  step: 38,
  score: 1240,
  status: 'playing',
  plan: 'planB',
  planId: 'bdbe684e-681c-4452-b5a6-291b55f79928',
  sequenceId: '34025f32-a2c1-4da8',
  sequenceIndex: 38,
  sequenceLength: 120,
  endReason: '',
  createdAt: '2026/4/21 18:22:45',
  lastUpdate: '2026/4/21 18:24:17',
  scores: [
    { step: 8, score: 32 },
    { step: 15, score: 96 },
    { step: 20, score: 184 },
    { step: 24, score: 288 },
    { step: 28, score: 448 },
    { step: 31, score: 640 },
    { step: 34, score: 880 },
    { step: 37, score: 1120 },
    { step: 38, score: 1240 },
  ],
  sequencePreview: ['2','4','2','8','4','2','16','4','8','2','32','2','4','16','8','2','4','stone','8','2','32','4','16','2','64','4','2','8','16','4','2','128','8','2','4','32','2','16','64'],
};

// ────────────────────────────────────────────────────────────────
// Page header / chrome helpers
// ────────────────────────────────────────────────────────────────
function PageHeader({ title, crumbs, actions }) {
  return (
    <div style={{ height: 48, borderBottom: '1px solid #ececf2', display: 'flex', alignItems: 'center', padding: '0 22px', background: '#fff', flexShrink: 0 }}>
      {crumbs && crumbs.map((c, i) => (
        <React.Fragment key={i}>
          <div style={{ fontSize: '0.8125rem', color: i === crumbs.length - 1 ? '#2a2a33' : '#9b9ba6', fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</div>
          {i < crumbs.length - 1 && <div style={{ color: '#d0d0d6', margin: '0 8px', fontSize: '0.6875rem' }}>/</div>}
        </React.Fragment>
      )) }
      {!crumbs && <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{title}</div>}
      <div style={{ flex: 1 }} />
      {actions}
    </div>
  );
}

function RefreshBtn() {
  return (
    <button style={{ fontSize: '0.75rem', padding: '5px 12px', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name="RefreshCw" size={12} /> 刷新
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// 统计 Stats — 7 KPI cards
// ════════════════════════════════════════════════════════════════
function StatsPage() {
  const cards = [
    { key: 'total',  label: '总局数',      value: STATS.totalGames,     hint: '点击查看游戏局', accent: '#5a7cff' },
    { key: 'play',   label: '进行中',      value: STATS.playingGames,    hint: 'playing',        accent: '#ffb93c' },
    { key: 'done',   label: '已结束',      value: STATS.finishedGames,   hint: 'finished',       accent: '#1fa85a' },
    { key: 'users',  label: '独立玩家',    value: STATS.uniquePlayers,   hint: '按 fingerprint', accent: '#4ecd7a' },
    { key: 'top',    label: '最高分',      value: STATS.topScore,        hint: '全量记录',        accent: '#c83a3a' },
    { key: 'plans',  label: '序列方案数',  value: STATS.sequencePlans,   hint: 'Plans',          accent: '#c14dff' },
    { key: 'seqs',   label: '已生成序列',  value: STATS.generatedSequences, hint: 'Sequences',   accent: '#8e5dff' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="统计" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f7f7fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1 }} />
          <RefreshBtn />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {cards.map((c) => (
            <div key={c.key} style={{
              background: '#fff', border: '1px solid #ececf2', borderRadius: 10,
              padding: '18px 20px', cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: c.accent, opacity: 0.65 }} />
              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{c.label}</div>
              <div style={{
                fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                fontSize: '1.875rem', color: '#2a2a33', fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1, marginBottom: 6,
              }}>{c.value.toLocaleString()}</div>
              <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{c.hint}</div>
            </div>
          ))}
        </div>

        {/* quick insights strip */}
        <div style={{
          marginTop: 20, background: '#fff', border: '1px solid #ececf2', borderRadius: 10,
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>近 24 小时趋势</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Spark label="新增局数" value="+1,284" delta="+12%" positive data={[4,6,5,8,7,9,12,10,14,13,16,18]} color="#5a7cff" />
            <Spark label="独立玩家" value="+342" delta="+8%" positive data={[2,3,2,4,5,4,6,5,7,8,7,9]} color="#4ecd7a" />
            <Spark label="平均得分" value="1,820" delta="-3%" data={[8,7,9,8,7,6,8,7,6,5,7,6]} color="#ffb93c" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Spark({ label, value, delta, positive, data, color }) {
  const max = Math.max(...data);
  const w = 200, h = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1.125rem', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: '0.6875rem', color: positive ? '#1fa85a' : '#c83a3a', fontWeight: 500 }}>{delta}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 样本分析 PlanAnalysis — 12-column table + expand + end-reasons
// ════════════════════════════════════════════════════════════════
function PlanAnalysisPage() {
  const [expanded, setExpanded] = React.useState(new Set([PLAN_STATS[0].id]));
  const [seqSheet, setSeqSheet] = React.useState(null);
  const totalEnd = END_REASONS.overall.reduce((a, e) => a + e.count, 0);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="样本分析" />
      <div style={{ flex: 1, overflow: 'auto', padding: 22, background: '#f7f7fa' }}>
        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1 }} />
          <RefreshBtn />
        </div>
        {/* main table */}
        <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#fafafc' }}>
                  <th style={analysisTh}></th>
                  <th style={analysisTh}>Plan ID</th>
                  <th style={analysisTh}>Plan Name</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>样本数</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>独立用户数</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>游玩次数</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>最小得分</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>最大得分</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>平均得分</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>中位数得分</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>平均时长</th>
                  <th style={{ ...analysisTh, textAlign: 'right' }}>中位时长</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_STATS.map((p, rowIdx) => {
                  const isOpen = expanded.has(p.id);
                  const numTd = { ...analysisTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' };
                  const numTdDim = { ...numTd, color: '#6a6a74' };
                  return (
                    <React.Fragment key={p.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => toggle(p.id)}>
                        <td style={{ ...analysisTd, width: 28, paddingRight: 0 }}>
                          <span style={{ color: '#6a6a74', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                            <Icon name="ChevronRight" size={14} />
                          </span>
                        </td>
                        <td style={{ ...analysisTd, fontFamily: 'Menlo, monospace', fontSize: '0.6875rem', color: '#6a6a74' }}>{p.id.slice(0, 8)}…{p.id.slice(-4)}</td>
                        <td style={{ ...analysisTd, fontWeight: 600, color: '#2a2a33', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{p.name}</td>
                        <td style={numTd}>{p.seq_count}</td>
                        <td style={numTdDim}>{p.unique.toLocaleString()}</td>
                        <td style={numTd}>{p.games.toLocaleString()}</td>
                        <td style={numTdDim}>{p.score_min.toLocaleString()}</td>
                        <td style={numTdDim}>{p.score_max.toLocaleString()}</td>
                        <td style={{ ...numTd, fontWeight: 600 }}>{p.score_avg.toLocaleString()}</td>
                        <td style={numTd}>{p.score_med.toLocaleString()}</td>
                        <td style={numTdDim}>{p.dur_avg}s</td>
                        <td style={numTdDim}>{p.dur_med}s</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={12} style={{ padding: 0, background: '#fafafc', borderBottom: '1px solid #ececf2' }}>
                            <div style={{ padding: '12px 20px 14px 42px' }}>
                              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                                {p.name} · 序列明细 ({(PLAN_SEQ_STATS[p.id] || []).length || '暂无'})
                              </div>
                              {PLAN_SEQ_STATS[p.id] ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem', background: '#fff', border: '1px solid #ececf2', borderRadius: 6, overflow: 'hidden' }}>
                                  <thead>
                                    <tr style={{ background: '#fff' }}>
                                      <th style={seqTh}>ID</th>
                                      <th style={seqTh}>序列 ID</th>
                                      <th style={seqTh}>序列名称</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>游玩次数</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>独立用户数</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>最小得分</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>最大得分</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>平均得分</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>中位数得分</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>平均时长</th>
                                      <th style={{ ...seqTh, textAlign: 'right' }}>中位时长</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {PLAN_SEQ_STATS[p.id].map((s) => (
                                      <tr key={s.id}
                                        onClick={() => setSeqSheet({ plan: p, sequence: s })}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#fff3ea';
                                          e.currentTarget.style.boxShadow = 'inset 2px 0 0 #c87a3a';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#fff';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}>
                                        <td style={{ ...seqTd, fontFamily: 'Menlo, monospace', color: '#6a6a74' }}>{s.id}</td>
                                        <td style={{ ...seqTd, fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500 }}>{s.name}</td>
                                        <td style={{ ...seqTd, color: '#2a2a33' }}>{s.displayName || '—'}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{s.games.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#6a6a74' }}>{s.unique.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>{s.score_min.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>{s.score_max.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>{s.score_avg.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{s.score_med.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>{s.dur_avg}s</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span>{s.dur_med}s</span>
                                            <span style={{ color: '#c6c6cc', display: 'inline-flex' }}><Icon name="ChevronRight" size={12} /></span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: '0.7188rem', color: '#9b9ba6', padding: '8px 0' }}>暂无序列数据</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* end_reason card */}
        <div style={{ marginTop: 16, background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>终止原因分布</div>
            <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>全量 {totalEnd.toLocaleString()} 局</div>
          </div>

          {/* stacked bar */}
          <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', background: '#f4f4f8', marginBottom: 14 }}>
            {END_REASONS.overall.map((e) => (
              <div key={e.key} title={`${e.label} · ${e.count.toLocaleString()} · ${((e.count / totalEnd) * 100).toFixed(1)}%`}
                style={{ flex: `0 0 ${(e.count / totalEnd) * 100}%`, background: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6562rem', color: '#fff', fontWeight: 500, letterSpacing: 0.3, overflow: 'hidden' }}>
                {((e.count / totalEnd) * 100) >= 6 && `${((e.count / totalEnd) * 100).toFixed(1)}%`}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {END_REASONS.overall.map((e) => (
              <div key={e.key} style={{ border: '1px solid #f0f0f4', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color }} />
                  <div style={{ fontSize: '0.6562rem', color: '#6a6a74', letterSpacing: 0.4, fontWeight: 500 }}>{e.label}</div>
                </div>
                <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>{e.count.toLocaleString()}</div>
                <div style={{ fontSize: '0.6562rem', color: '#9b9ba6' }}>{((e.count / totalEnd) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SequenceAnalysisSheet
        open={!!seqSheet}
        onClose={() => setSeqSheet(null)}
        plan={seqSheet && seqSheet.plan}
        sequence={seqSheet && seqSheet.sequence}
      />
    </div>
  );
}

const analysisTh = {
  textAlign: 'left', padding: '10px 12px',
  fontSize: '0.625rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.5,
  fontWeight: 500, borderBottom: '1px solid #ececf2', whiteSpace: 'nowrap',
};
const analysisTd = {
  padding: '10px 12px', borderBottom: '1px solid #f4f4f8',
  verticalAlign: 'middle', whiteSpace: 'nowrap',
};
const seqTh = {
  textAlign: 'left', padding: '7px 10px', fontSize: '0.625rem', color: '#8a8a94',
  textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500,
  borderBottom: '1px solid #ececf2',
};
const seqTd = { padding: '7px 10px', borderBottom: '1px solid #f8f8fa' };

function SequenceAnalysisSheet({ open, onClose, plan, sequence }) {
  const [tab, setTab] = React.useState('overview');
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  React.useEffect(() => {
    if (open) setTab('overview');
  }, [open, sequence && sequence.id]);

  if (!open || !sequence) return null;

  const detail = SEQUENCE_ANALYSIS_DETAILS[sequence.id] || {
    headline: '当前序列详情',
    summary: '这是该序列 ID 的基础分析视图。',
    focus: '优先查看在线玩家数、累计样本和结束原因分布。',
    playingPlayers: 0,
    playingGames: 0,
    todayPlayers: 0,
    hourGames: 0,
    finishedGames: Math.max(0, sequence.games),
    avgStep: null,
    medStep: null,
    status: 'disabled',
    createdAt: '—',
    endReasons: [],
    recentGames: [],
  };
  const totalGames = sequence.games;
  const totalPlayers = sequence.unique;
  const totalEnd = detail.endReasons.reduce((sum, item) => sum + item.count, 0) || 1;
  const statusEnabled = detail.status === 'enabled';
  const kpis = [
    { label: '当前在玩玩家数', value: detail.playingPlayers, hint: '按 fingerprint 去重', accent: '#5a7cff' },
    { label: '当前在玩局数', value: detail.playingGames, hint: 'status = playing', accent: '#ffb93c' },
    { label: '累计独立玩家数', value: totalPlayers, hint: '历史累计', accent: '#4ecd7a' },
    { label: '累计游玩次数', value: totalGames, hint: '全部游戏局', accent: '#c14dff' },
  ];
  const perfCards = [
    { label: '平均得分', value: sequence.score_avg.toLocaleString(), sub: `中位数 ${sequence.score_med.toLocaleString()}` },
    { label: '平均时长', value: `${sequence.dur_avg}s`, sub: `中位时长 ${sequence.dur_med}s` },
    { label: '平均步数', value: detail.avgStep == null ? '—' : String(detail.avgStep), sub: detail.medStep == null ? '中位步数 —' : `中位步数 ${detail.medStep}` },
    { label: '今日新增玩家', value: detail.todayPlayers.toLocaleString(), sub: `近 1 小时新增局 ${detail.hourGames}` },
  ];

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: 60, animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '72vw', maxWidth: 1080,
        background: '#f7f7fa', zIndex: 70,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.15)',
        animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="关闭"
          style={{
            position: 'absolute', top: 14, right: '100%',
            width: 40, height: 40,
            background: '#fff', border: '1px solid #ececf2', borderRadius: 4,
            color: '#6a6a74', fontSize: '1.375rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}><Icon name="X" size={18} /></button>
        <div style={{ flex: 1, overflow: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>序列 ID</div>
                <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1.25rem', color: '#2a2a33' }}>{sequence.name}</div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 8px', borderRadius: 10, fontSize: '0.6562rem', fontWeight: 500,
                background: statusEnabled ? '#e6f5ec' : '#f4f4f8',
                color: statusEnabled ? '#1fa85a' : '#9b9ba6',
                border: `1px solid ${statusEnabled ? '#c8e6d3' : '#ececf2'}`,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusEnabled ? '#1fa85a' : '#b0b0b8' }} />
                {statusEnabled ? 'enabled' : 'disabled'}
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right', fontSize: '0.7188rem', color: '#8a8a94' }}>
                <div>所属 Plan <span style={{ color: '#2a2a33', fontWeight: 600, marginLeft: 6 }}>{plan ? plan.name : '—'}</span></div>
                <div style={{ marginTop: 4 }}>创建时间 <span style={{ color: '#2a2a33', fontFamily: 'Menlo, monospace', marginLeft: 6 }}>{detail.createdAt}</span></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', columnGap: 20, rowGap: 10, fontSize: '0.7812rem' }}>
              <div style={{ color: '#8a8a94' }}>内部记录 ID</div>
              <div style={{ fontFamily: 'Menlo, monospace', color: '#2a2a33' }}>{sequence.id}</div>
              <div style={{ color: '#8a8a94' }}>序列名称</div>
              <div style={{ color: '#2a2a33' }}>{sequence.displayName || '—'}</div>
              <div style={{ color: '#8a8a94' }}>摘要</div>
              <div style={{ color: '#2a2a33', fontWeight: 500 }}>{detail.headline}</div>
              <div style={{ color: '#8a8a94' }}>分析结论</div>
              <div style={{ color: '#6a6a74', lineHeight: 1.7 }}>{detail.summary}</div>
              <div style={{ color: '#8a8a94' }}>当前关注点</div>
              <div style={{ color: '#6a6a74', lineHeight: 1.7 }}>{detail.focus}</div>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3 }}>
            {[
              { k: 'overview', label: '概览' },
              { k: 'all-games', label: `全部游戏 (${detail.recentGames.length})` },
            ].map((item) => (
              <button key={item.k} onClick={() => setTab(item.k)} style={{
                padding: '5px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6,
                background: tab === item.k ? '#2a2a33' : 'transparent',
                color: tab === item.k ? '#fff' : '#6a6a74',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>{item.label}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <React.Fragment>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {kpis.map((kpi) => (
                  <div key={kpi.label} style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: kpi.accent, opacity: 0.7 }} />
                    <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{kpi.label}</div>
                    <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>{kpi.value.toLocaleString()}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{kpi.hint}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
                <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>表现指标</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {perfCards.map((item) => (
                      <div key={item.label} style={{ border: '1px solid #f0f0f4', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 8 }}>{item.label}</div>
                        <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>{item.value}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>结束原因分布</div>
                    <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>已结束 {detail.finishedGames.toLocaleString()} 局</div>
                  </div>
                  <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: '#f4f4f8', marginBottom: 12 }}>
                    {detail.endReasons.map((e) => (
                      <div key={e.key} title={`${e.label} · ${e.count.toLocaleString()}`}
                        style={{ flex: `0 0 ${(e.count / totalEnd) * 100}%`, background: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: '#fff', fontWeight: 500 }}>
                        {((e.count / totalEnd) * 100) >= 14 ? `${((e.count / totalEnd) * 100).toFixed(0)}%` : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.endReasons.map((e) => (
                      <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7188rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                        <span style={{ color: '#6a6a74', minWidth: 92 }}>{e.label}</span>
                        <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#2a2a33', minWidth: 44 }}>{e.count.toLocaleString()}</span>
                        <span style={{ color: '#9b9ba6' }}>{((e.count / totalEnd) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </React.Fragment>
          )}

          {tab === 'all-games' && (
            <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', padding: '16px 18px 12px', borderBottom: '1px solid #f0f0f4' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>全部游戏</div>
                <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>围绕当前序列 ID 的全部游戏列表</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem' }}>
                <thead>
                  <tr style={{ background: '#fafafc' }}>
                    <th style={seqTh}>Game ID</th>
                    <th style={seqTh}>Fingerprint</th>
                    <th style={seqTh}>状态</th>
                    <th style={{ ...seqTh, textAlign: 'right' }}>得分</th>
                    <th style={{ ...seqTh, textAlign: 'right' }}>步数</th>
                    <th style={{ ...seqTh, textAlign: 'right' }}>时长</th>
                    <th style={{ ...seqTh, textAlign: 'right' }}>最后更新</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentGames.map((game) => (
                    <tr key={game.gameId}>
                      <td style={{ ...seqTd, fontFamily: 'Menlo, monospace', color: '#2a2a33' }}>{game.gameId}</td>
                      <td style={{ ...seqTd, fontFamily: 'Menlo, monospace', color: '#6a6a74' }}>{game.fp}</td>
                      <td style={seqTd}><StatusPill status={game.status} /></td>
                      <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>{game.score.toLocaleString()}</td>
                      <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>{game.step}</td>
                      <td style={{ ...seqTd, textAlign: 'right', color: '#6a6a74' }}>{game.dur}</td>
                      <td style={{ ...seqTd, textAlign: 'right', color: '#9b9ba6', fontFamily: 'Menlo, monospace' }}>{game.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// ════════════════════════════════════════════════════════════════
// 游戏局 Games — paginated list + filters + bulk
// ════════════════════════════════════════════════════════════════
function GamesPage() {
  const [tab, setTab] = React.useState('all');
  const [sel, setSel] = React.useState(new Set());
  const [sheetGame, setSheetGame] = React.useState(null);
  const filtered = tab === 'all' ? GAMES : GAMES.filter((g) => g.status === tab);
  const allSelected = filtered.length > 0 && filtered.every((g) => sel.has(g.id));
  const toggleAll = () => {
    const n = new Set(sel);
    if (allSelected) filtered.forEach((g) => n.delete(g.id));
    else filtered.forEach((g) => n.add(g.id));
    setSel(n);
  };
  const toggleOne = (id) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSel(n);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="游戏局" />
      <div style={{ flex: 1, overflow: 'auto', padding: 22, background: '#f7f7fa' }}>
        {/* tabs + 批量删除 + 搜索 + 刷新 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3 }}>
            {[
              { k: 'all', label: '全部', n: GAMES.length },
              { k: 'playing', label: '进行中', n: GAMES.filter((g) => g.status === 'playing').length },
              { k: 'finished', label: '已结束', n: GAMES.filter((g) => g.status === 'finished').length },
            ].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                padding: '5px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6,
                background: tab === t.k ? '#2a2a33' : 'transparent',
                color: tab === t.k ? '#fff' : '#6a6a74',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>{t.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{t.n}</span></button>
            ))}
          </div>
          <button style={{ ...secondaryBtn, padding: '5px 11px', fontSize: '0.75rem', opacity: sel.size ? 1 : 0.45, cursor: sel.size ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="Trash2" size={12} /> 批量删除 {sel.size ? `(${sel.size})` : ''}
          </button>
          <div style={{ flex: 1 }} />
          <input placeholder="按 game_id 或 fingerprint 搜索…" style={{
            width: 260, padding: '6px 12px', fontSize: '0.75rem', border: '1px solid #e6e6ec',
            borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
          <RefreshBtn />
        </div>

        {/* table */}
        <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#fafafc' }}>
                <th style={{ ...analysisTh, width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={analysisTh}>Game ID</th>
                <th style={analysisTh}>Fingerprint</th>
                <th style={analysisTh}>Plan</th>
                <th style={analysisTh}>状态</th>
                <th style={{ ...analysisTh, textAlign: 'right' }}>得分</th>
                <th style={{ ...analysisTh, textAlign: 'right' }}>步数</th>
                <th style={{ ...analysisTh, textAlign: 'right' }}>时长</th>
                <th style={analysisTh}>创建</th>
                <th style={{ ...analysisTh, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const sc = Math.min(1, g.score / 12000);
                return (
                  <tr key={g.id} onClick={() => setSheetGame(g)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...analysisTd, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={sel.has(g.id)} onChange={() => toggleOne(g.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ ...analysisTd, fontFamily: 'Menlo, monospace', fontSize: '0.7188rem' }}>{g.id}</td>
                    <td style={{ ...analysisTd, fontFamily: 'Menlo, monospace', fontSize: '0.7188rem', color: '#6a6a74' }}>{g.fp}</td>
                    <td style={{ ...analysisTd, fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500 }}>{g.plan}</td>
                    <td style={analysisTd}><StatusPill status={g.status} /></td>
                    <td style={{ ...analysisTd, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <div style={{ width: 64, height: 4, background: '#f0f0f4', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${sc * 100}%`, height: '100%', background: '#5a7cff' }} />
                        </div>
                        <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, minWidth: 52, textAlign: 'right' }}>{g.score.toLocaleString()}</div>
                      </div>
                    </td>
                    <td style={{ ...analysisTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#6a6a74' }}>{g.step}</td>
                    <td style={{ ...analysisTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#6a6a74' }}>{g.dur}s</td>
                    <td style={{ ...analysisTd, color: '#9b9ba6' }}>{g.created}</td>
                    <td style={{ ...analysisTd, textAlign: 'right', color: '#c6c6cc' }}><Icon name="ChevronRight" size={14} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: '#6a6a74' }}>
          <div>显示 1–{filtered.length} / 共 {GAMES.length} 条</div>
          <div style={{ flex: 1 }} />
          <button style={{ ...secondaryBtn, padding: '5px 10px', fontSize: '0.75rem' }}>‹</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, '…', 24].map((p, i) => (
              <button key={i} style={{
                width: 28, height: 28, borderRadius: 6, fontSize: '0.75rem',
                border: p === 1 ? 'none' : '1px solid #e6e6ec',
                background: p === 1 ? '#2a2a33' : '#fff',
                color: p === 1 ? '#fff' : '#5a5a66',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{p}</button>
            ))}
          </div>
          <button style={{ ...secondaryBtn, padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}><Icon name="ChevronRight" size={14} /></button>
        </div>
      </div>
      <GameDetailSheet open={!!sheetGame} onClose={() => setSheetGame(null)} game={sheetGame} />
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    playing:  { c: '#d48a1f', bg: '#fdf4e6', label: '进行中' },
    finished: { c: '#1fa85a', bg: '#e6f5ec', label: '已结束' },
  };
  const m = map[status] || map.finished;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 10, fontSize: '0.6562rem', fontWeight: 500,
      background: m.bg, color: m.c, border: `1px solid ${m.c}22`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.c }} />
      {m.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// 游戏局详情 GameDetail
// ════════════════════════════════════════════════════════════════
// Pick a deterministic sequence for a game based on its plan + id.
// Matches the plan's real sequences from ALL_PLANS when available
// (planA / planB defined), else synthesizes a short fallback name.
function getMockSequenceForGame(g) {
  if (!g) return { id: '', name: '' };
  const plans = (typeof window !== 'undefined' && window.ALL_PLANS) || [];
  const plan = plans.find((p) => p.name === g.plan);
  const hashHex = (g.id || '').replace(/-/g, '').slice(0, 6) || '000000';
  const hash = parseInt(hashHex, 16) || 0;
  if (plan && plan.sequences && plan.sequences.length > 0) {
    const pick = plan.sequences[Math.abs(hash) % plan.sequences.length];
    return { id: pick.id, name: pick.name, plan, sequence: pick };
  }
  // synthesize short name for plans without defined sequences
  const tag = hashHex.slice(0, 4);
  return { id: hashHex, name: `${g.plan}_seq_${tag}`, plan: null, sequence: null };
}

// Build a full game-detail mock from a single GamesPage row (row has only
// id/fp/plan/status/score/step/dur/created).  Reuses GAME_DETAIL's richer
// fields (scores curve, sequence preview) for the parts that don't need to
// differ per row.  Status 'finished' → progress maxed + endReason set.
function buildGameDetail(g) {
  if (!g) return null;
  const isFinished = g.status === 'finished';
  const sequenceLength = 120;
  const fpFull = g.fp && g.fp.endsWith('…') ? g.fp.replace('…', '5f7e8b1') : (g.fp || '');
  const seedHex = (g.id || '').replace(/-/g, '').slice(0, 8);
  const seed = parseInt(seedHex, 16);
  const seq = getMockSequenceForGame(g);
  return {
    id: g.id + '-9d04-1e7c83b99f02',
    fp: fpFull,
    userId: '',
    seed: Number.isFinite(seed) ? Math.abs(seed) : 1729516234,
    step: g.step,
    score: g.score,
    status: g.status,
    plan: g.plan,
    planId: 'bdbe684e-681c-4452-b5a6-291b55f79928',
    sequenceId: seq.name,  // short name like planB_seq_4b81
    sequenceRef: (seq.plan && seq.sequence) ? { plan: seq.plan, sequence: seq.sequence } : null,
    sequenceIndex: isFinished ? sequenceLength : Math.min(g.step, sequenceLength),
    sequenceLength,
    endReason: isFinished ? 'GAMEOVER' : '',
    createdAt: `2026/4/21 ${g.created}`,
    lastUpdate: `2026/4/21 ${g.created}`,
    scores: GAME_DETAIL.scores,
    sequencePreview: (seq.sequence && seq.sequence.tokens)
      ? seq.sequence.tokens.slice(0, 39)
      : GAME_DETAIL.sequencePreview,
  };
}

function GameDetailSheet({ open, onClose, game }) {
  const [seqSheet, setSeqSheet] = React.useState(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape' && !seqSheet) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose, seqSheet]);

  if (!open || !game) return null;

  const g = buildGameDetail(game);
  const progress = g.sequenceIndex / g.sequenceLength;
  const seqClickable = !!g.sequenceRef;

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: 60, animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '80vw', maxWidth: 1200,
        background: '#f7f7fa', zIndex: 70,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.15)',
        animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="关闭"
          style={{
            position: 'absolute', top: 14, right: '100%',
            width: 40, height: 40,
            background: '#fff', border: '1px solid #ececf2', borderRadius: 4,
            color: '#6a6a74', fontSize: '1.375rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}><Icon name="X" size={18} /></button>
      <div style={{ flex: 1, overflow: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* top actions bar (删除) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button style={{
            padding: '5px 12px', fontSize: '0.75rem', background: '#fff', color: '#c83a3a',
            border: '1px solid #f0d6d6', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><Icon name="Trash2" size={13} /> 删除</button>
        </div>
        {/* header card */}
        <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: 'Menlo, monospace', fontSize: '0.875rem', fontWeight: 600 }}>{g.id}</div>
            <StatusPill status={g.status} />
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6 }}>当前得分</div>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.625rem', color: '#2a2a33', lineHeight: 1.1 }}>{g.score.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, fontSize: '0.7188rem', color: '#8a8a94' }}>
            <MetaCell label="Plan"       value={g.plan} />
            <MetaCell label="Fingerprint" value={g.fp} mono />
            <MetaCell label="Seed"        value={g.seed} mono />
            <MetaCell label="步数"        value={g.step} />
            <MetaCell label="创建"        value={g.createdAt} />
            <MetaCell label="最后更新"    value={g.lastUpdate} last />
          </div>
        </div>

        {/* progress + score curve row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '18px 22px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>序列进度</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}>{g.sequenceIndex}</div>
              <div style={{ color: '#9b9ba6', fontSize: '0.8125rem' }}>/ {g.sequenceLength}</div>
              <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#6a6a74' }}>{Math.round(progress * 100)}% 已消费</div>
            </div>
            <div style={{ width: '100%', height: 10, background: '#f0f0f4', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(to right, #5a7cff, #8a5cff)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#9b9ba6' }}>
              <span>序列 {seqClickable ? (
                <button onClick={() => setSeqSheet(g.sequenceRef)} title="查看序列详情"
                  style={{
                    fontFamily: 'Menlo, monospace', color: '#5a7cff',
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted',
                    textUnderlineOffset: 3, fontSize: 'inherit',
                  }}>{g.sequenceId}</button>
              ) : (
                <span style={{ fontFamily: 'Menlo, monospace', color: '#5a5a66' }}>{g.sequenceId}</span>
              )}</span>
              <span>剩余 {g.sequenceLength - g.sequenceIndex} 块</span>
            </div>
          </div>

          {/* TODO: 含义待定，暂时注释
          <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>得分曲线</div>
              <div style={{ fontSize: '0.6562rem', color: '#9b9ba6' }}>每次合成快照</div>
            </div>
            <ScoreCurve scores={g.scores} maxStep={g.step} />
          </div>
          */}
        </div>

        {/* sequence preview */}
        <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>序列时间轴</div>
            <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>前 {g.sequencePreview.length} / {g.sequenceLength} 块 · 当前位置 <b style={{ color: '#5a7cff' }}>#{g.sequenceIndex}</b></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {g.sequencePreview.map((tok, i) => {
              const v = tok === 'stone' ? 0 : Number(tok);
              const isCurrent = i === g.sequenceIndex - 1;
              const played = i < g.sequenceIndex;
              return (
                <div key={i} title={`#${i + 1} · ${tok}`} style={{
                  position: 'relative',
                  opacity: played ? 1 : 0.35,
                  filter: isCurrent ? 'none' : (played ? 'none' : 'grayscale(0.3)'),
                }}>
                  <CandyChip v={v} size={26} />
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', left: -2, right: -2, top: -2, bottom: -2,
                      border: '2px solid #5a7cff', borderRadius: '50%',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              );
            })}
            <div style={{ padding: '6px 10px', fontSize: '0.6875rem', color: '#9b9ba6', display: 'flex', alignItems: 'center' }}>+ {g.sequenceLength - g.sequencePreview.length} more</div>
          </div>
        </div>
      </div>
      </div>
      <SequenceDetailSheet
        open={!!seqSheet}
        onClose={() => setSeqSheet(null)}
        plan={seqSheet && seqSheet.plan}
        sequence={seqSheet && seqSheet.sequence}
        zLevel={1}
      />
    </React.Fragment>
  );
}

function ScoreCurve({ scores, maxStep }) {
  const w = 400, h = 84;
  const maxScore = Math.max(...scores.map((s) => s.score));
  const pts = scores.map((s) => {
    const x = (s.step / maxStep) * w;
    const y = h - (s.score / maxScore) * (h - 6) - 3;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 84, display: 'block' }}>
      <defs>
        <linearGradient id="scoreG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a7cff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5a7cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#scoreG)" />
      <path d={path} fill="none" stroke="#5a7cff" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="#fff" stroke="#5a7cff" strokeWidth="1" />)}
    </svg>
  );
}

Object.assign(window, {
  STATS, PLAN_STATS, END_REASONS, GAMES, GAME_DETAIL,
  StatsPage, PlanAnalysisPage, GamesPage, GameDetailSheet,
  PageHeader, RefreshBtn, StatusPill,
});
