import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronRight } from 'lucide-react';
import { api } from '@/api/client';
import type { PlanStat, PlanStatsResp, PlanSequenceStatsResp, SequenceStat } from '@/api/types';
import { PageHeader } from '@/components/ui/page-header';
import { RefreshBtn } from '@/components/ui/refresh-btn';

interface PlanAnalysisPageProps {
  onSelectSequence?: (planId: string, sequenceId: string) => void;
}

const fmt0 = (v: number) => Math.round(v).toLocaleString();
const fmtSec = (v: number) => `${Math.round(v)}s`;

const analysisTh = { padding: '10px 12px', fontSize: '0.625rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, borderBottom: '1px solid #ececf2', whiteSpace: 'nowrap', textAlign: 'left' } as const;
const analysisTd = { padding: '10px 12px', borderBottom: '1px solid #f0f0f4', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--color-text)' } as const;
const seqTh = { padding: '8px 12px', fontSize: '0.6562rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, borderBottom: '1px solid #f0f0f4', textAlign: 'left', whiteSpace: 'nowrap' } as const;
const seqTd = { padding: '10px 12px', fontSize: '0.7188rem', borderBottom: '1px solid #f6f6f9', whiteSpace: 'nowrap' } as const;

function formatShortPlanId(planId: string | null) {
  if (!planId) return '—';
  return planId.length <= 12 ? planId : `${planId.slice(0, 8)}…${planId.slice(-4)}`;
}

function EndReasonCard({ plans }: { plans: PlanStat[] }) {
  const aggregated = useMemo(() => {
    const totals = new Map<string, number>();
    for (const plan of plans) {
      for (const [key, count] of Object.entries(plan.end_reasons ?? {})) totals.set(key, (totals.get(key) ?? 0) + count);
    }
    return Array.from(totals.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }, [plans]);
  const total = aggregated.reduce((sum, entry) => sum + entry.count, 0);
  const colorMap: Record<string, string> = { gameover: '#22c55e', timeout: '#f59e0b', new_game: '#0ea5e9', sequence_force_deleted: '#ef4444' };
  const labelMap: Record<string, string> = { gameover: 'GameOver', timeout: '超时', new_game: '新开局', sequence_force_deleted: '序列强制删除' };

  return (
    <div style={{ marginTop: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>终止原因分布</div>
        <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>全量 {total.toLocaleString()} 局</div>
      </div>
      {aggregated.length === 0 || total === 0 ? <div style={{ fontSize: '0.75rem', color: '#9b9ba6' }}>暂无终止原因数据</div> : <>
        <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', background: '#f4f4f8', marginBottom: 14 }}>
          {aggregated.map((entry) => {
            const pct = (entry.count / total) * 100;
            const color = colorMap[entry.key] ?? '#9ca3af';
            const label = labelMap[entry.key] ?? entry.key;
            return <div key={entry.key} title={`${label} · ${entry.count.toLocaleString()} · ${pct.toFixed(1)}%`} style={{ flex: `0 0 ${pct}%`, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6562rem', color: '#fff', fontWeight: 500, letterSpacing: 0.3, overflow: 'hidden' }}>{pct >= 6 ? `${pct.toFixed(1)}%` : ''}</div>;
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {aggregated.map((entry) => {
            const pct = (entry.count / total) * 100;
            const color = colorMap[entry.key] ?? '#9ca3af';
            const label = labelMap[entry.key] ?? entry.key;
            return <div key={entry.key} style={{ border: '1px solid #f0f0f4', borderRadius: 8, padding: '8px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: color }} /><div style={{ fontSize: '0.6562rem', color: '#6a6a74', letterSpacing: 0.4, fontWeight: 500 }}>{label}</div></div><div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>{entry.count.toLocaleString()}</div><div style={{ fontSize: '0.6562rem', color: '#9b9ba6' }}>{pct.toFixed(1)}%</div></div>;
          })}
        </div>
      </>}
    </div>
  );
}

export function PlanAnalysisPage({ onSelectSequence }: PlanAnalysisPageProps = {}) {
  const [data, setData] = useState<PlanStatsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [seqData, setSeqData] = useState<Record<string, SequenceStat[]>>({});
  const [seqLoading, setSeqLoading] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      setData(await api<PlanStatsResp>('/api/admin/plan-stats'));
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(planId: string | null) {
    if (!planId) return;
    const next = new Set(expanded);
    if (next.has(planId)) {
      next.delete(planId);
      setExpanded(next);
      return;
    }
    next.add(planId);
    setExpanded(next);
    if (seqData[planId]) return;
    setSeqLoading((current) => new Set(current).add(planId));
    try {
      const response = await api<PlanSequenceStatsResp>(`/api/admin/plan-sequence-stats?plan_id=${encodeURIComponent(planId)}`);
      setSeqData((current) => ({ ...current, [planId]: response.sequences }));
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载序列统计失败');
    } finally {
      setSeqLoading((current) => {
        const nextLoading = new Set(current);
        nextLoading.delete(planId);
        return nextLoading;
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="样本分析" />
      <div style={{ flex: 1, overflow: 'auto', padding: 22, background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1 }} />
          <RefreshBtn onClick={() => void load()} loading={loading} />
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#fafafc' }}>
                  <th style={{ ...analysisTh, width: 32 }} />
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
                {!data || data.plans.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ ...analysisTd, padding: '24px 12px', textAlign: 'center', color: '#9b9ba6' }}>{loading ? '加载中...' : '暂无数据'}</td>
                  </tr>
                ) : (
                  data.plans.flatMap((plan, index) => {
                    const rowKey = plan.plan_id || `__none__${index}`;
                    const isExpanded = plan.plan_id ? expanded.has(plan.plan_id) : false;
                    const isSeqLoading = plan.plan_id ? seqLoading.has(plan.plan_id) : false;
                    const sequences = plan.plan_id ? seqData[plan.plan_id] : undefined;
                    const numericCell = { ...analysisTd, textAlign: 'right' as const, fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' };
                    const secondaryCell = { ...numericCell, color: 'var(--color-text-secondary)', fontWeight: 'normal' as const };
                    return [
                      <tr key={rowKey} style={{ cursor: plan.plan_id ? 'pointer' : 'default' }} onClick={() => void toggleExpand(plan.plan_id)}>
                        <td style={{ ...analysisTd, width: 32, paddingRight: 0 }}>
                          {plan.plan_id ? <span style={{ color: '#6a6a74', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><ChevronRight size={14} /></span> : null}
                        </td>
                        <td style={{ ...analysisTd, fontFamily: 'Menlo, monospace', fontSize: '0.6875rem', color: '#6a6a74' }}>{formatShortPlanId(plan.plan_id)}</td>
                        <td style={{ ...analysisTd, fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, color: 'var(--color-text)' }}>{plan.plan_name ?? '—'}</td>
                        <td style={numericCell}>{plan.games_total.toLocaleString()}</td>
                        <td style={secondaryCell}>{plan.unique_players.toLocaleString()}</td>
                        <td style={numericCell}>{plan.games_total.toLocaleString()}</td>
                        <td style={secondaryCell}>{fmt0(plan.score.min ?? 0)}</td>
                        <td style={secondaryCell}>{fmt0(plan.score.max ?? 0)}</td>
                        <td style={{ ...numericCell, fontWeight: 600, color: 'var(--color-text)' }}>{fmt0(plan.score.avg ?? 0)}</td>
                        <td style={numericCell}>{fmt0(plan.score.median ?? 0)}</td>
                        <td style={{ ...analysisTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmtSec(plan.duration_sec.avg ?? 0)}</td>
                        <td style={{ ...analysisTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmtSec(plan.duration_sec.median ?? 0)}</td>
                      </tr>,
                      isExpanded && (
                        <tr key={`${rowKey}_seq`}>
                          <td colSpan={12} style={{ padding: 0, background: '#fafafc', borderBottom: '1px solid #ececf2' }}>
                            <div style={{ padding: '12px 20px 14px 42px' }}>
                              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                                {(plan.plan_name ?? '—') + ' · 序列明细 (' + (sequences?.length ?? (isSeqLoading ? '...' : '暂无')) + ')'}
                              </div>
                              {isSeqLoading ? (
                                <div style={{ fontSize: '0.7188rem', color: '#9b9ba6', padding: '8px 0' }}>加载中...</div>
                              ) : sequences && sequences.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem', background: '#fff', border: '1px solid #ececf2', borderRadius: 6, overflow: 'hidden' }}>
                                  <thead>
                                    <tr style={{ background: '#fff' }}>
                                      <th style={seqTh}>ID</th>
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
                                    {sequences.map((sequence) => (
                                      <tr key={sequence.sequence_id} onClick={() => onSelectSequence?.(plan.plan_id!, sequence.sequence_id)} style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fff3ea'; e.currentTarget.style.boxShadow = 'inset 2px 0 0 #c87a3a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}>
                                        <td style={{ ...seqTd, fontFamily: 'Menlo, monospace', color: '#6a6a74' }}>{sequence.sequence_id.slice(0, 12)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{sequence.games_total.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{sequence.unique_players.toLocaleString()}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmt0(sequence.score_min ?? 0)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmt0(sequence.score_max ?? 0)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-text)' }}>{fmt0(sequence.score_avg ?? 0)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{fmt0(sequence.score_median ?? 0)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmtSec(sequence.duration_avg ?? 0)}</td>
                                        <td style={{ ...seqTd, textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span>{fmtSec(sequence.duration_median ?? 0)}</span>
                                            <span style={{ color: '#c6c6cc', display: 'inline-flex' }}><ChevronRight size={12} /></span>
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
                      ),
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <EndReasonCard plans={data?.plans || []} />
      </div>
    </div>
  );
}

export default PlanAnalysisPage;
