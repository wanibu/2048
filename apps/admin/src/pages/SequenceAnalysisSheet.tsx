import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import { api } from '@/api/client';
import type { GamesResp, SequenceAnalysis } from '@/api/types';

interface SequenceAnalysisSheetProps {
  open: boolean;
  sequenceId: string | null;
  onClose: () => void;
}

type TabKey = 'overview' | 'all-games';

const fmtNum = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString());
const fmtSec = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(0)}s`);
const shortId = (s: string | null | undefined) => (s ?? '—');
const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false });
};

const tableHeadStyle = {
  padding: '10px 12px',
  fontSize: '0.6562rem',
  color: '#8a8a94',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  fontWeight: 500,
  borderBottom: '1px solid #f0f0f4',
  textAlign: 'left',
  whiteSpace: 'nowrap',
} as const;

const tableCellStyle = {
  padding: '10px 12px',
  fontSize: '0.7188rem',
  borderBottom: '1px solid #f6f6f9',
  whiteSpace: 'nowrap',
  color: 'var(--color-text)',
} as const;

const endReasonColorMap: Record<string, string> = {
  gameover: '#22c55e',
  timeout: '#f59e0b',
  new_game: '#0ea5e9',
  sequence_force_deleted: '#ef4444',
};

const endReasonLabelMap: Record<string, string> = {
  gameover: 'GameOver',
  timeout: '超时',
  new_game: '新开局',
  sequence_force_deleted: '序列强制删除',
};

function StatusBadge({ status }: { status: 'enabled' | 'disabled' }) {
  const enabled = status === 'enabled';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: '0.6562rem',
        fontWeight: 500,
        background: enabled ? '#e6f5ec' : '#f4f4f8',
        color: enabled ? '#1fa85a' : '#9b9ba6',
        border: `1px solid ${enabled ? '#c8e6d3' : 'var(--color-border)'}`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: enabled ? '#1fa85a' : '#9b9ba6',
        }}
      />
      {status}
    </span>
  );
}

function GameStatusPill({ status }: { status: string }) {
  const palette =
    status === 'playing'
      ? { label: '进行中', bg: '#e9f2ff', text: '#2f6fed', border: '#c9dcff' }
      : status === 'finished'
        ? { label: '已结束', bg: '#e8f7ef', text: '#1f9d57', border: '#caead8' }
        : { label: status || '—', bg: '#f4f4f8', text: '#7a7a85', border: '#e4e4eb' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: '0.6562rem',
        fontWeight: 500,
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
      }}
    >
      {palette.label}
    </span>
  );
}

export function SequenceAnalysisSheet({
  open,
  sequenceId,
  onClose,
}: SequenceAnalysisSheetProps) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<SequenceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamesData, setGamesData] = useState<GamesResp | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setTab('overview');
    setGamesData(null);
    setGamesError(null);
  }, [sequenceId]);

  useEffect(() => {
    if (!open || !sequenceId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void api<SequenceAnalysis>(`/api/admin/sequence/${encodeURIComponent(sequenceId)}/analysis`)
      .then((response) => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { error?: string })?.error || '加载序列分析失败';
        setError(message);
        setData(null);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sequenceId]);

  useEffect(() => {
    if (!open || !sequenceId || tab !== 'all-games' || gamesData) return;

    let cancelled = false;
    setGamesLoading(true);
    setGamesError(null);

    void api<GamesResp>(
      `/api/admin/games?sequence_id=${encodeURIComponent(sequenceId)}&page=1&limit=50`,
    )
      .then((response) => {
        if (cancelled) return;
        setGamesData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { error?: string })?.error || '加载游戏列表失败';
        setGamesError(message);
        setGamesData(null);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setGamesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sequenceId, tab, gamesData]);

  const endReasonEntries = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.end_reasons ?? {})
      .map(([key, count]) => ({
        key,
        count,
        color: endReasonColorMap[key] ?? '#94a3b8',
        label: endReasonLabelMap[key] ?? key,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (!open || !sequenceId) return null;

  const gamesTabCount = gamesData?.total ?? gamesData?.games.length ?? data?.games_total ?? 0;
  const totalEndReasons = endReasonEntries.reduce((sum, item) => sum + item.count, 0) || 1;
  const kpis = data
    ? [
        { label: '当前在玩玩家数', value: data.playing_players, hint: '按 user_id 去重', accent: '#5a7cff' },
        { label: '当前在玩局数', value: data.playing_games, hint: 'status = playing', accent: '#ffb93c' },
        { label: '累计独立玩家数', value: data.unique_players, hint: '历史累计', accent: '#4ecd7a' },
        { label: '累计游玩次数', value: data.games_total, hint: '全部游戏局', accent: '#c14dff' },
      ]
    : [];

  const perfCards = data
    ? [
        {
          label: '平均得分',
          value: fmtNum(data.score.avg),
          sub: `中位数 ${fmtNum(data.score.median)}`,
        },
        {
          label: '平均时长',
          value: fmtSec(data.duration_sec.avg),
          sub: `中位时长 ${fmtSec(data.duration_sec.median)}`,
        },
        {
          label: '平均步数',
          value: fmtNum(data.step.avg),
          sub: `中位步数 ${fmtNum(data.step.median)}`,
        },
        {
          label: '今日新增玩家',
          value: fmtNum(data.today_players),
          sub: `近 1 小时新增局 ${fmtNum(data.hour_games)}`,
        },
      ]
    : [];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.35)',
          zIndex: 60,
          animation: 'planSheetOverlayIn 200ms ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '72vw',
          maxWidth: 1080,
          background: 'var(--color-bg)',
          zIndex: 70,
          boxShadow: '-12px 0 32px rgba(0,0,0,0.15)',
          animation: 'planSheetSlideIn 280ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: '100%',
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            color: '#6a6a74',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {loading ? (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '32px 22px',
                color: '#8a8a94',
                fontSize: '0.8125rem',
              }}
            >
              加载中...
            </div>
          ) : error ? (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid #f0d4d4',
                borderRadius: 10,
                padding: '18px 22px',
                color: '#b54646',
                fontSize: '0.7812rem',
              }}
            >
              {error}
            </div>
          ) : data ? (
            <>
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '18px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        color: '#8a8a94',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        marginBottom: 4,
                      }}
                    >
                      系列名称
                    </div>
                    <div
                      style={{
                        fontFamily: 'Fredoka, system-ui, sans-serif',
                        fontWeight: 600,
                        fontSize: '1.25rem',
                        color: '#2a2a33',
                      }}
                    >
                      {data.name || '—'}
                    </div>
                  </div>
                  <StatusBadge status={data.status} />
                  <div style={{ flex: 1 }} />
                  <div style={{ textAlign: 'right', fontSize: '0.7188rem', color: '#8a8a94' }}>
                    <div>
                      所属 Plan
                      <span style={{ color: '#2a2a33', fontWeight: 600, marginLeft: 6 }}>
                        {data.plan_name || '—'}
                      </span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      创建时间
                      <span
                        style={{
                          color: '#2a2a33',
                          fontFamily: 'Menlo, monospace',
                          marginLeft: 6,
                        }}
                      >
                        {fmtDate(data.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  background: '#fff',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                {[
                  { k: 'overview', label: '概览' },
                  { k: 'all-games', label: `全部游戏 (${gamesTabCount})` },
                ].map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    onClick={() => setTab(item.k as TabKey)}
                    style={{
                      padding: '5px 14px',
                      fontSize: '0.75rem',
                      border: 'none',
                      borderRadius: 6,
                      background: tab === item.k ? '#2a2a33' : 'transparent',
                      color: tab === item.k ? '#fff' : '#6a6a74',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {kpis.map((kpi) => (
                      <div
                        key={kpi.label}
                        style={{
                          background: '#fff',
                          border: '1px solid #ececf2',
                          borderRadius: 10,
                          padding: '16px 18px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 3,
                            height: '100%',
                            background: kpi.accent,
                            opacity: 0.7,
                          }}
                        />
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            color: '#8a8a94',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 10,
                          }}
                        >
                          {kpi.label}
                        </div>
                        <div
                          style={{
                            fontFamily: 'Fredoka, system-ui, sans-serif',
                            fontWeight: 600,
                            fontSize: '1.75rem',
                            lineHeight: 1.1,
                            fontVariantNumeric: 'tabular-nums',
                            marginBottom: 6,
                          }}
                        >
                          {fmtNum(kpi.value)}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{kpi.hint}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #ececf2',
                        borderRadius: 10,
                        padding: '16px 18px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>
                        表现指标
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        {perfCards.map((item) => (
                          <div
                            key={item.label}
                            style={{
                              border: '1px solid #f0f0f4',
                              borderRadius: 8,
                              padding: '12px 14px',
                            }}
                          >
                            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 8 }}>
                              {item.label}
                            </div>
                            <div
                              style={{
                                fontFamily: 'Fredoka, system-ui, sans-serif',
                                fontWeight: 600,
                                fontSize: '1.125rem',
                                marginBottom: 4,
                              }}
                            >
                              {item.value}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{item.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #ececf2',
                        borderRadius: 10,
                        padding: '16px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>结束原因分布</div>
                        <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>
                          已结束 {fmtNum(data.games_finished)} 局
                        </div>
                      </div>
                      {endReasonEntries.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#9b9ba6' }}>暂无终止原因数据</div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              height: 22,
                              borderRadius: 6,
                              overflow: 'hidden',
                              background: '#f4f4f8',
                              marginBottom: 12,
                            }}
                          >
                            {endReasonEntries.map((entry) => {
                              const pct = (entry.count / totalEndReasons) * 100;
                              return (
                                <div
                                  key={entry.key}
                                  title={`${entry.label} · ${entry.count.toLocaleString()}`}
                                  style={{
                                    flex: `0 0 ${pct}%`,
                                    background: entry.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.625rem',
                                    color: '#fff',
                                    fontWeight: 500,
                                  }}
                                >
                                  {pct >= 14 ? `${pct.toFixed(0)}%` : ''}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {endReasonEntries.map((entry) => {
                              const pct = (entry.count / totalEndReasons) * 100;
                              return (
                                <div
                                  key={entry.key}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: '0.7188rem',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 2,
                                      background: entry.color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span style={{ color: '#6a6a74', minWidth: 92 }}>{entry.label}</span>
                                  <span
                                    style={{
                                      fontFamily: 'Fredoka, system-ui, sans-serif',
                                      fontVariantNumeric: 'tabular-nums',
                                      color: '#2a2a33',
                                      minWidth: 44,
                                    }}
                                  >
                                    {entry.count.toLocaleString()}
                                  </span>
                                  <span style={{ color: '#9b9ba6' }}>{pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {tab === 'all-games' && (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #ececf2',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '16px 18px 12px',
                      borderBottom: '1px solid #f0f0f4',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>全部游戏</div>
                    <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>
                      围绕当前系列的全部游戏列表
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.6875rem',
                        color: '#9b9ba6',
                        fontFamily: 'Menlo, monospace',
                      }}
                    >
                      {fmtNum(gamesData?.total ?? gamesData?.games.length ?? 0)}
                    </div>
                  </div>
                  {gamesLoading ? (
                    <div style={{ padding: '18px', fontSize: '0.75rem', color: '#9b9ba6' }}>加载中...</div>
                  ) : gamesError ? (
                    <div style={{ padding: '18px', fontSize: '0.75rem', color: '#b54646' }}>{gamesError}</div>
                  ) : !gamesData || gamesData.games.length === 0 ? (
                    <div style={{ padding: '18px', fontSize: '0.75rem', color: '#9b9ba6' }}>暂无游戏数据</div>
                  ) : (
                    <div style={{ overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem' }}>
                        <thead>
                          <tr style={{ background: '#fafafc' }}>
                            <th style={tableHeadStyle}>Game ID</th>
                            <th style={tableHeadStyle}>User ID</th>
                            <th style={tableHeadStyle}>状态</th>
                            <th style={{ ...tableHeadStyle, textAlign: 'right' }}>得分</th>
                            <th style={{ ...tableHeadStyle, textAlign: 'right' }}>步数</th>
                            <th style={{ ...tableHeadStyle, textAlign: 'right' }}>时长</th>
                            <th style={{ ...tableHeadStyle, textAlign: 'right' }}>最后更新</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gamesData.games.map((game) => {
                            const duration =
                              game.status === 'finished' && game.created_at && game.ended_at
                                ? `${Math.max(
                                    0,
                                    Math.round(
                                      (new Date(game.ended_at).getTime() -
                                        new Date(game.created_at).getTime()) /
                                        1000,
                                    ),
                                  )}s`
                                : '—';

                            return (
                              <tr key={game.game_id}>
                                <td
                                  style={{
                                    ...tableCellStyle,
                                    fontFamily: 'Menlo, monospace',
                                    color: '#2a2a33',
                                  }}
                                >
                                  {shortId(game.game_id)}
                                </td>
                                <td
                                  style={{
                                    ...tableCellStyle,
                                    fontFamily: 'Menlo, monospace',
                                    color: '#6a6a74',
                                  }}
                                >
                                  {shortId(game.user_id)}
                                </td>
                                <td style={tableCellStyle}>
                                  <GameStatusPill status={game.status} />
                                </td>
                                <td
                                  style={{
                                    ...tableCellStyle,
                                    textAlign: 'right',
                                    fontFamily: 'Fredoka, system-ui, sans-serif',
                                    fontWeight: 600,
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {fmtNum(game.score)}
                                </td>
                                <td
                                  style={{
                                    ...tableCellStyle,
                                    textAlign: 'right',
                                    fontFamily: 'Fredoka, system-ui, sans-serif',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {fmtNum(game.step)}
                                </td>
                                <td style={{ ...tableCellStyle, textAlign: 'right', color: '#6a6a74' }}>
                                  {duration}
                                </td>
                                <td
                                  style={{
                                    ...tableCellStyle,
                                    textAlign: 'right',
                                    color: '#9b9ba6',
                                    fontFamily: 'Menlo, monospace',
                                  }}
                                >
                                  {fmtDate(game.last_update_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
