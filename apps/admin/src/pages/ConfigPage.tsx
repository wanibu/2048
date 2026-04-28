import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Sliders } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { GeneratedSequence, Plan, PlanStage, PlansResp, SequencesResp } from '@/api/types';
import { DetailVariantA } from '@/components/config/DetailVariantA';
import { PlanEditSheet } from '@/components/config/PlanEditSheet';
import { SequenceDetailSheet } from '@/components/config/SequenceDetailSheet';
import { SequenceEditSheet } from '@/components/config/SequenceEditSheet';
import { StageDetailSheet } from '@/components/config/StageDetailSheet';
import { DistributionPanel } from '@/pages/DistributionPanel';
import { PageHeader } from '@/components/ui/page-header';
import { RefreshBtn } from '@/components/ui/refresh-btn';

export function ConfigPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sequences, setSequences] = useState<GeneratedSequence[]>([]);
  const section = searchParams.get('section');
  const isDistributionView = section === 'distribution';
  const selectedPlanId = isDistributionView ? null : searchParams.get('plan');
  const setSelectedPlanId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete('section');
    if (id) next.set('plan', id); else next.delete('plan');
    setSearchParams(next, { replace: false });
  };
  const showDistribution = () => {
    const next = new URLSearchParams(searchParams);
    next.set('section', 'distribution');
    next.delete('plan');
    next.delete('tab');
    setSearchParams(next, { replace: false });
  };
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'new' | 'edit'>('new');
  const [editTargetPlan, setEditTargetPlan] = useState<Plan | null>(null);
  const [stageSheet, setStageSheet] = useState<{ stage: PlanStage; index: number } | null>(null);
  const [seqDetailId, setSeqDetailId] = useState<string | null>(null);
  const [seqEditTarget, setSeqEditTarget] = useState<GeneratedSequence | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [plansResp, sequencesResp] = await Promise.all([
        api<PlansResp>('/api/admin/sequence-plans?page=1&limit=500'),
        api<SequencesResp>('/api/admin/generated-sequences?page=1&limit=1000'),
      ]);
      setPlans(plansResp.plans);
      setSequences(sequencesResp.sequences);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (isDistributionView) return; // 在分布视图时不自动选 plan
    if (plans.length === 0) {
      setSelectedPlanId(null);
      return;
    }
    if (!selectedPlanId || !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId, isDistributionView]);

  const filteredPlans = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plans;
    return plans.filter((plan) => plan.name.toLowerCase().includes(keyword));
  }, [plans, query]);

  const planSequenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sequence of sequences) counts.set(sequence.sequence_plan_id, (counts.get(sequence.sequence_plan_id) ?? 0) + 1);
    return counts;
  }, [sequences]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const planSequences = useMemo(
    () => (selectedPlan ? sequences.filter((sequence) => sequence.sequence_plan_id === selectedPlan.id) : []),
    [selectedPlan, sequences],
  );

  async function deletePlan(plan: Plan) {
    if (!window.confirm(`确认删除 Plan "${plan.name}"？此操作不可撤销。`)) return;
    try {
      await api(`/api/admin/sequence-plans/${plan.id}`, { method: 'DELETE' });
      toast.success('已删除');
      if (selectedPlanId === plan.id) setSelectedPlanId(null);
      await loadAll();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  async function deleteSequence(sequence: GeneratedSequence) {
    const seqLabel = sequence.sequence_name || sequence.id.slice(0, 8) + '…';
    if (!window.confirm(`确认删除序列「${seqLabel}」？此操作不可撤销。`)) return;
    try {
      await api(`/api/admin/generated-sequences/${sequence.id}`, { method: 'DELETE' });
      toast.success('已删除');
      await loadAll();
    } catch (err) {
      const e = err as { error?: string; refCount?: number; playingCount?: number; status?: number };
      // 后端返回 refCount/playingCount 时给二次确认（强制删除）
      if (e.refCount && e.refCount > 0) {
        const playing = e.playingCount ?? 0;
        const msg = `序列「${seqLabel}」被 ${e.refCount} 局游戏引用` +
          (playing > 0 ? `（其中 ${playing} 局正在进行中）。` : '。') +
          `\n\n强制删除会：\n• 立即终止进行中的局（end_reason = sequence_force_deleted）\n• 解除已结束局的引用\n• 清空 distribution 与 users 表中对该序列的配置\n\n确定强制删除？`;
        if (!window.confirm(msg)) return;
        try {
          const r = await api<{ success: boolean; stoppedGames: number }>(
            `/api/admin/generated-sequences/${sequence.id}?force=true`,
            { method: 'DELETE' },
          );
          toast.success(`已强制删除${r.stoppedGames > 0 ? `，停掉 ${r.stoppedGames} 局进行中` : ''}`);
          await loadAll();
        } catch (err2) {
          toast.error((err2 as { error?: string })?.error || '强制删除失败');
        }
        return;
      }
      toast.error(e.error || '删除失败');
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader title="配置" right={<RefreshBtn onClick={() => void loadAll()} loading={loading} />} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 248, borderRight: '1px solid #ececf2', background: '#fff', padding: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 全局分布快捷入口（与 Plan 列表平级，固定在最上方） */}
          <button
            type="button"
            onClick={showDistribution}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '0.7812rem',
              borderRadius: 6,
              background: isDistributionView ? '#fff3ea' : 'transparent',
              color: '#2a2a33',
              fontWeight: isDistributionView ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'inherit',
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            <Sliders size={14} color={isDistributionView ? '#c87a3a' : '#9b9ba6'} />
            <span>全局分布</span>
          </button>
          <div style={{ height: 1, background: '#ececf2', margin: '0 -14px' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 Plan"
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => {
                setEditMode('new');
                setEditTargetPlan(null);
                setEditOpen(true);
              }}
              title="新增 Plan"
              style={{ padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={12} />
              新增
            </button>
          </div>
          <div style={{ minHeight: 0, overflow: 'auto' }}>
            {plans.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: '0.75rem', color: '#9b9ba6' }}>暂无 Plan，点击右上角新增</div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: '0.75rem', color: '#9b9ba6' }}>无匹配结果</div>
            ) : (
              filteredPlans.map((plan) => {
                const active = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.7812rem', borderRadius: 6, background: active ? '#fff3ea' : 'transparent', color: '#2a2a33', fontWeight: active ? 600 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, cursor: 'pointer', border: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={(event) => {
                      if (!active) event.currentTarget.style.background = '#fafafc';
                    }}
                    onMouseLeave={(event) => {
                      if (!active) event.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ wordBreak: 'break-all' }}>{plan.name}</span>
                    <span style={{ color: active ? '#c87a3a' : '#9b9ba6', fontWeight: 500, fontSize: '0.6875rem', marginLeft: 8 }}>{planSequenceCounts.get(plan.id) ?? 0}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#f7f7fa' }}>
          {isDistributionView ? (
            <DistributionPanel />
          ) : selectedPlan ? (
            <DetailVariantA
              plan={selectedPlan}
              sequences={planSequences}
              onEdit={() => {
                setEditMode('edit');
                setEditTargetPlan(selectedPlan);
                setEditOpen(true);
              }}
              onDelete={() => void deletePlan(selectedPlan)}
              onGenerateSequence={async () => {
                if (!selectedPlan) return;
                try {
                  await api('/api/admin/generate-sequence', {
                    method: 'POST',
                    body: { sequence_plan_id: selectedPlan.id },
                  });
                  toast.success('已生成序列');
                  await loadAll();
                } catch (error) {
                  toast.error((error as { error?: string })?.error || '生成失败');
                }
              }}
              onSelectStage={(stage, stageIndex) => setStageSheet({ stage, index: stageIndex })}
              onSelectSequence={(sequence) => setSeqDetailId(sequence.id)}
              onEditSequence={(sequence) => setSeqEditTarget(sequence)}
              onDeleteSequence={(sequence) => void deleteSequence(sequence)}
              onRefresh={() => void loadAll()}
            />
          ) : (
            <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9b9ba6', fontSize: '0.8125rem' }}>
              {plans.length === 0 ? '暂无 Plan' : '请选择一个 Plan'}
            </div>
          )}
        </div>
      </div>
      <PlanEditSheet
        open={editOpen}
        mode={editMode}
        initialPlan={editTargetPlan}
        onClose={() => setEditOpen(false)}
        onSaved={async (saved) => {
          await loadAll();
          if (saved?.id) setSelectedPlanId(saved.id);
        }}
      />
      <StageDetailSheet
        open={stageSheet !== null}
        stage={stageSheet?.stage ?? null}
        stageIndex={stageSheet?.index ?? 0}
        onClose={() => setStageSheet(null)}
      />
      <SequenceDetailSheet open={seqDetailId !== null} sequenceId={seqDetailId} onClose={() => setSeqDetailId(null)} />
      <SequenceEditSheet
        open={seqEditTarget !== null}
        sequence={seqEditTarget}
        onClose={() => setSeqEditTarget(null)}
        onSaved={async () => {
          await loadAll();
          setSeqEditTarget(null);
        }}
      />
    </div>
  );
}
