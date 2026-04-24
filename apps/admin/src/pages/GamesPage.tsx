import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { Game, GameDetail, GamesResp, Stats } from '@/api/types';
import type { GamesStatusFilter } from '@/App';
import { CandyChip } from '@/components/ui/candy-chip';
import { PageHeader } from '@/components/ui/page-header';
import { RefreshBtn } from '@/components/ui/refresh-btn';
import { StatusPill } from '@/components/ui/status-pill';

interface Props {
  statusFilter: GamesStatusFilter;
  onStatusFilterChange: (f: GamesStatusFilter) => void;
}

function formatNumber(n: number) {
  return n.toLocaleString('en-US');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '—';
  return time.toLocaleString('zh-CN', { hour12: false });
}

function formatDurationSec(game: Game) {
  if (game.status !== 'finished' || !game.ended_at) return '—';
  const start = Date.parse(game.created_at);
  const end = Date.parse(game.ended_at);
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  return `${Math.round((end - start) / 1000)}s`;
}

function truncate(value: string | null | undefined, length: number) {
  if (!value) return '—';
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function buildPageItems(current: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages]);
  for (let i = current - 2; i <= current + 2; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && page - prev > 1) items.push('…');
    items.push(page);
  }
  return items;
}

function parseSequence(sequence: string | null | undefined) {
  if (!sequence) return [];
  try {
    const parsed = JSON.parse(sequence);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function MetaCell({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.6562rem',
          color: 'var(--color-text-muted)',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-text)',
          fontFamily: mono ? 'Menlo, Monaco, monospace' : 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function GameDetailSheet({
  open,
  gameId,
  onClose,
  onDeleted,
}: {
  open: boolean;
  gameId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !gameId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    async function loadDetail() {
      setLoading(true);
      try {
        const next = await api<GameDetail>(`/api/admin/game/${gameId}`);
        if (!cancelled) setDetail(next);
      } catch (err) {
        if (!cancelled) {
          toast.error((err as { error?: string })?.error || '加载详情失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [gameId, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const sequenceTokens = useMemo(() => parseSequence(detail?.sequence), [detail?.sequence]);
  const displayedTokens = sequenceTokens.slice(0, 60);
  const sequencePct = detail?.sequence_length
    ? Math.round(((detail.sequence_index || 0) / detail.sequence_length) * 100)
    : 0;

  async function handleDelete() {
    if (!gameId) return;
    if (!confirm(`确认删除局 ${gameId}？`)) return;
    setDeleting(true);
    try {
      await api(`/api/admin/delete-game/${gameId}`, { method: 'DELETE' });
      toast.success('已删除');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16,16,24,0.35)',
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
          width: '80vw',
          maxWidth: 1200,
          zIndex: 70,
          background: 'var(--color-bg)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.15)',
          animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: 14,
            right: '100%',
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            color: 'var(--color-text-soft)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => void handleDelete()}
              disabled={loading || deleting || !detail}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                background: '#fef2f2',
                color: '#c83a3a',
                border: '1px solid #fecaca',
                borderRadius: 6,
                cursor: loading || deleting || !detail ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                opacity: loading || deleting || !detail ? 0.6 : 1,
              }}
            >
              <Trash2 size={13} />
              删除
            </button>
          </div>

          {loading || !detail ? (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: 22,
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              加载中...
            </div>
          ) : (
            <>
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '18px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Menlo, Monaco, monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                    {detail.game_id}
                  </div>
                  <StatusPill status={detail.status} />
                  <div style={{ flex: 1 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        marginBottom: 2,
                      }}
                    >
                      当前得分
                    </div>
                    <div
                      style={{
                        fontFamily: 'Fredoka, system-ui, sans-serif',
                        fontWeight: 700,
                        fontSize: '1.625rem',
                        color: 'var(--color-text)',
                        lineHeight: 1.1,
                      }}
                    >
                      {formatNumber(detail.score)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 14 }}>
                  <MetaCell label="Plan" value={detail.plan_name ?? '—'} />
                  <MetaCell label="Fingerprint" value={truncate(detail.fingerprint, 12)} mono />
                  <MetaCell label="Seed" value={String(detail.seed)} mono />
                  <MetaCell label="Steps" value={formatNumber(detail.step)} />
                  <MetaCell label="Created" value={formatDateTime(detail.created_at)} />
                  <MetaCell label="Last Update" value={formatDateTime(detail.last_update_at)} />
                </div>
              </div>

              {detail.sequence_length > 0 && (
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '18px 22px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>序列进度</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                    <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}>
                      {detail.sequence_index}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      / {detail.sequence_length}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 10,
                      borderRadius: 999,
                      background: '#eef0f5',
                      overflow: 'hidden',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (detail.sequence_index / detail.sequence_length) * 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #5a7cff, #c14dff)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    <span>序列 {truncate(detail.generated_sequence_id, 12)}</span>
                    <span>剩余 {Math.max(0, detail.sequence_length - detail.sequence_index)} 块</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {sequencePct}% 已消费
                  </div>
                </div>
              )}

              {sequenceTokens.length > 0 && (
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '18px 22px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>序列时间轴</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      {displayedTokens.length} / {detail.sequence_length} 块 · 当前位置 #{detail.sequence_index}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {displayedTokens.map((token, index) => {
                      const value = token === 'stone' ? 0 : Number(token);
                      const played = index < detail.sequence_index;
                      const current = index === detail.sequence_index;
                      return (
                        <div
                          key={`${String(token)}-${index}`}
                          style={{
                            opacity: played ? 1 : 0.35,
                            filter: index > detail.sequence_index ? 'grayscale(0.7)' : 'none',
                            boxShadow: current ? '0 0 0 2px #5a7cff' : 'none',
                            borderRadius: 999,
                          }}
                        >
                          <CandyChip v={Number.isFinite(value) ? value : 0} size={26} />
                        </div>
                      );
                    })}
                    {sequenceTokens.length > 60 && (
                      <div
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        + {sequenceTokens.length - 60} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function GamesPage({ statusFilter, onStatusFilterChange }: Props) {
  const [page, setPage] = useState(1);
  const [limit, _setLimit] = useState(20);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  async function loadStats() {
    try {
      const nextStats = await api<Stats>('/api/admin/stats');
      setStats(nextStats);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    }
  }

  async function load(p = page, f = statusFilter, q = debouncedQuery) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (f !== 'all') params.set('status', f);
      if (q) params.set('q', q);
      const res = await api<GamesResp>(`/api/admin/games?${params.toString()}`);
      setGames(res.games);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim();
      setDebouncedQuery(prev => {
        if (prev === nextQuery) return prev;
        setPage(1);
        return nextQuery;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void load(page, statusFilter, debouncedQuery);
  }, [page, statusFilter, debouncedQuery]);

  const allSelected = games.length > 0 && games.every((game) => selectedIds.has(game.game_id));
  const someSelected = games.some((game) => selectedIds.has(game.game_id));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);
  const pageItems = buildPageItems(page, totalPages);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        games.forEach((game) => next.delete(game.game_id));
      } else {
        games.forEach((game) => next.add(game.game_id));
      }
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`确认删除选中的 ${selectedIds.size} 局？`)) return;
    try {
      await api('/api/admin/delete-games', {
        method: 'POST',
        body: { ids: Array.from(selectedIds) },
      });
      toast.success('删除成功');
      setSelectedIds(new Set());
      await Promise.all([load(page, statusFilter, debouncedQuery), loadStats()]);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    const nextQuery = query.trim();
    setPage(1);
    setDebouncedQuery(nextQuery);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="游戏局" />

      <div style={{ flex: 1, overflow: 'auto', padding: 22, background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: 3,
            }}
          >
            {[
              { key: 'all' as const, label: '全部', count: stats?.totalGames ?? total },
              { key: 'playing' as const, label: '进行中', count: stats?.playingGames ?? 0 },
              { key: 'finished' as const, label: '已结束', count: stats?.finishedGames ?? 0 },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setPage(1);
                  onStatusFilterChange(item.key);
                }}
                style={{
                  padding: '5px 14px',
                  border: 'none',
                  borderRadius: 6,
                  background: statusFilter === item.key ? '#2a2a33' : 'transparent',
                  color: statusFilter === item.key ? '#fff' : '#6a6a74',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {item.label} <span style={{ opacity: 0.72, marginLeft: 3 }}>{formatNumber(item.count)}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => void handleBatchDelete()}
            disabled={selectedIds.size === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 6,
              background: '#fff',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedIds.size === 0 ? 0.45 : 1,
            }}
          >
            <Trash2 size={12} />
            删除选中 ({selectedIds.size})
          </button>

          <div style={{ flex: 1 }} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="按 game_id 或 fingerprint 搜索…"
            style={{
              width: 260,
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              background: '#fff',
              fontSize: '0.75rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <RefreshBtn onClick={() => void load(page, statusFilter, debouncedQuery)} loading={loading} />
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#fafafc' }}>
                <th style={{ width: 40, padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(node) => {
                      if (!node) return;
                      node.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'left' }}>Game ID</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'left' }}>Fingerprint</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'left' }}>Plan</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'right' }}>Score</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'right' }}>Steps</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'right' }}>Duration</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'left' }}>Created</th>
                <th style={{ width: 28, padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: '20px 12px',
                      borderBottom: '1px solid #f6f6f9',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    加载中...
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: '20px 12px',
                      borderBottom: '1px solid #f6f6f9',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                games.map((game) => {
                  const scorePct = Math.min(100, (game.score / 12000) * 100);
                  return (
                    <tr
                      key={game.game_id}
                      onClick={() => setDetailId(game.game_id)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = '#fafafc';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td
                        style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'center' }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(game.game_id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleOne(game.game_id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          fontFamily: 'Menlo, Monaco, monospace',
                          fontSize: '0.7188rem',
                        }}
                      >
                        {truncate(game.game_id, 12)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          fontFamily: 'Menlo, Monaco, monospace',
                          fontSize: '0.7188rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {truncate(game.fingerprint, 8)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          fontFamily: 'Fredoka, system-ui, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        {game.plan_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9' }}>
                        <StatusPill status={game.status} />
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f6f6f9', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 64,
                              height: 6,
                              background: '#eef0f5',
                              borderRadius: 999,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${scorePct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #5a7cff, #c14dff)',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              minWidth: 56,
                              textAlign: 'right',
                              fontFamily: 'Fredoka, system-ui, sans-serif',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatNumber(game.score)}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          textAlign: 'right',
                          fontFamily: 'Menlo, Monaco, monospace',
                        }}
                      >
                        {game.step.toString()}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          textAlign: 'right',
                          fontFamily: 'Menlo, Monaco, monospace',
                        }}
                      >
                        {formatDurationSec(game)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {formatDateTime(game.created_at)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f6f6f9',
                          textAlign: 'right',
                          color: '#c6c6cc',
                        }}
                      >
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            显示 {start}–{end} / 共 {total} 条
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: '#fff',
                color: 'var(--color-text-soft)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {pageItems.map((item, index) => (
              <button
                key={`${item}-${index}`}
                onClick={() => {
                  if (typeof item === 'number') setPage(item);
                }}
                disabled={item === '…'}
                style={{
                  minWidth: 28,
                  height: 28,
                  padding: item === '…' ? '0 6px' : '0 8px',
                  borderRadius: 6,
                  border: typeof item === 'number' && item === page ? 'none' : '1px solid var(--color-border)',
                  background: typeof item === 'number' && item === page ? '#2a2a33' : '#fff',
                  color: typeof item === 'number' && item === page ? '#fff' : 'var(--color-text-soft)',
                  fontWeight: typeof item === 'number' && item === page ? 600 : 400,
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  cursor: item === '…' ? 'default' : 'pointer',
                }}
              >
                {item}
              </button>
            ))}

            <button
              onClick={() => setPage((prev) => Math.min(totalPages || 1, prev + 1))}
              disabled={page >= totalPages}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: '#fff',
                color: 'var(--color-text-soft)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <GameDetailSheet
        open={!!detailId}
        gameId={detailId}
        onClose={() => setDetailId(null)}
        onDeleted={() => {
          void Promise.all([load(page, statusFilter, debouncedQuery), loadStats()]);
        }}
      />
    </div>
  );
}
