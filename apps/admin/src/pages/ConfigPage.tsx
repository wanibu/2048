import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, Layers, ListOrdered,
  LayoutGrid, Sparkles, Play, Pause, RefreshCw, FileText,
} from 'lucide-react';
import { api } from '@/api/client';
import type { Plan, PlansResp, Stage, StagesResp, GeneratedSequence, SequencesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { PlanDialog } from '@/pages/PlansPage';
import { StageDialog } from '@/pages/StagesPage';
import { GenerateSequenceDialog, DeleteSequenceDialog } from '@/pages/SequencesPage';

type Selection =
  | { type: 'plan'; id: string }
  | { type: 'stage'; id: string }
  | { type: 'sequence'; id: string }
  | null;

export function ConfigPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [sequences, setSequences] = useState<GeneratedSequence[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selection>(null);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [planEditOpen, setPlanEditOpen] = useState(false);
  const [planEditing, setPlanEditing] = useState<Plan | null>(null);
  const [stageEditOpen, setStageEditOpen] = useState(false);
  const [stageEditing, setStageEditing] = useState<Stage | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [seqDelete, setSeqDelete] = useState<GeneratedSequence | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, s, gs] = await Promise.all([
        api<PlansResp>('/api/admin/sequence-plans?page=1&limit=500'),
        api<StagesResp>('/api/admin/stages?page=1&limit=500'),
        api<SequencesResp>('/api/admin/generated-sequences?page=1&limit=1000'),
      ]);
      setPlans(p.plans);
      setStages(s.stages);
      setSequences(gs.sequences);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const sequencesByPlan = new Map<string, GeneratedSequence[]>();
  for (const s of sequences) {
    const k = s.sequence_plan_id || '__none__';
    if (!sequencesByPlan.has(k)) sequencesByPlan.set(k, []);
    sequencesByPlan.get(k)!.push(s);
  }

  function togglePlan(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deletePlan(p: Plan) {
    if (!confirm(`删除 Plan "${p.name}"？`)) return;
    try {
      await api(`/api/admin/sequence-plans/${p.id}`, { method: 'DELETE' });
      toast.success('已删除');
      if (selected?.type === 'plan' && selected.id === p.id) setSelected(null);
      loadAll();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  async function deleteStage(s: Stage) {
    if (!confirm(`删除 Stage "${s.name}"？`)) return;
    try {
      await api(`/api/admin/stages/${s.id}`, { method: 'DELETE' });
      toast.success('已删除');
      if (selected?.type === 'stage' && selected.id === s.id) setSelected(null);
      loadAll();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  async function toggleSequence(s: GeneratedSequence) {
    const next = s.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await api(`/api/admin/generated-sequences/${s.id}`, { method: 'PUT', body: { status: next } });
      toast.success(`已${next === 'enabled' ? '启用' : '禁用'}`);
      loadAll();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '切换失败');
    }
  }

  const selectedPlan = selected?.type === 'plan' ? plans.find(p => p.id === selected.id) : null;
  const selectedStage = selected?.type === 'stage' ? stages.find(s => s.id === selected.id) : null;
  const selectedSequence = selected?.type === 'sequence' ? sequences.find(s => s.id === selected.id) : null;

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 min-h-[600px]">
      {/* ======== LEFT SIDEBAR ======== */}
      <Card className="overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <div className="text-xs font-semibold text-[var(--color-text-muted)]">配置</div>
          <Button variant="ghost" size="icon" onClick={loadAll} disabled={loading} title="刷新">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ---- Plans 区 ---- */}
          <SidebarSection
            icon={<Layers className="h-3.5 w-3.5" />}
            title="Plans"
            count={plans.length}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlanEditing(null);
                  setPlanEditOpen(true);
                }}
                className="p-0.5 rounded hover:bg-[var(--color-surface-2)] cursor-pointer"
                title="新增 Plan"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          >
            {plans.length === 0 ? (
              <EmptyHint>暂无 Plan — 点 + 新建</EmptyHint>
            ) : (
              plans.map(p => {
                const isExp = expanded.has(p.id);
                const planSeqs = sequencesByPlan.get(p.id) || [];
                const isSel = selected?.type === 'plan' && selected.id === p.id;
                return (
                  <div key={p.id}>
                    <div
                      className={`group flex items-center gap-1 pl-5 pr-2 py-1.5 cursor-pointer text-sm ${
                        isSel ? 'bg-[var(--color-primary)]/15 text-[var(--color-text)]' : 'hover:bg-[var(--color-surface-2)]'
                      }`}
                      onClick={() => setSelected({ type: 'plan', id: p.id })}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlan(p.id); }}
                        className="p-0.5 rounded hover:bg-[var(--color-surface-2)] cursor-pointer"
                      >
                        {isExp ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <Layers className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{planSeqs.length}</span>
                    </div>
                    {isExp && (
                      <div className="ml-10">
                        {planSeqs.length === 0 ? (
                          <div className="text-[11px] text-[var(--color-text-muted)] py-1 px-2">（无生成的 Sequence）</div>
                        ) : planSeqs.map(s => {
                          const isSelSeq = selected?.type === 'sequence' && selected.id === s.id;
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-xs ${
                                isSelSeq ? 'bg-[var(--color-primary)]/15' : 'hover:bg-[var(--color-surface-2)]'
                              }`}
                              onClick={() => setSelected({ type: 'sequence', id: s.id })}
                            >
                              <FileText className="h-3 w-3 text-[var(--color-text-muted)]" />
                              <span className="font-mono truncate flex-1">{s.id.slice(0, 8)}…</span>
                              {s.status === 'enabled' ? (
                                <Play className="h-2.5 w-2.5 text-[var(--color-success)]" />
                              ) : (
                                <Pause className="h-2.5 w-2.5 text-[var(--color-text-muted)]" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </SidebarSection>

          {/* ---- Stages 区 ---- */}
          <SidebarSection
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            title="Stages"
            count={stages.length}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStageEditing(null);
                  setStageEditOpen(true);
                }}
                className="p-0.5 rounded hover:bg-[var(--color-surface-2)] cursor-pointer"
                title="新增 Stage"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          >
            {stages.length === 0 ? (
              <EmptyHint>暂无 Stage — 点 + 新建</EmptyHint>
            ) : stages.map(s => {
              const isSel = selected?.type === 'stage' && selected.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected({ type: 'stage', id: s.id })}
                  className={`flex items-center gap-1.5 pl-7 pr-2 py-1.5 cursor-pointer text-sm ${
                    isSel ? 'bg-[var(--color-primary)]/15' : 'hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">长 {s.length}</span>
                </div>
              );
            })}
          </SidebarSection>

          {/* ---- Orphan Sequences（无 plan 的 Sequence，罕见）---- */}
          {(() => {
            const orphans = sequencesByPlan.get('__none__') || [];
            if (orphans.length === 0) return null;
            return (
              <SidebarSection
                icon={<ListOrdered className="h-3.5 w-3.5" />}
                title="Orphan Sequences"
                count={orphans.length}
              >
                {orphans.map(s => {
                  const isSel = selected?.type === 'sequence' && selected.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelected({ type: 'sequence', id: s.id })}
                      className={`flex items-center gap-1.5 pl-7 pr-2 py-1 cursor-pointer text-xs ${
                        isSel ? 'bg-[var(--color-primary)]/15' : 'hover:bg-[var(--color-surface-2)]'
                      }`}
                    >
                      <FileText className="h-3 w-3 text-[var(--color-text-muted)]" />
                      <span className="font-mono truncate flex-1">{s.id.slice(0, 8)}…</span>
                    </div>
                  );
                })}
              </SidebarSection>
            );
          })()}
        </div>
      </Card>

      {/* ======== RIGHT CONTENT ======== */}
      <div>
        {!selected && (
          <EmptyState
            onNewPlan={() => { setPlanEditing(null); setPlanEditOpen(true); }}
            onNewStage={() => { setStageEditing(null); setStageEditOpen(true); }}
          />
        )}

        {selectedPlan && (
          <PlanDetailView
            plan={selectedPlan}
            sequences={sequencesByPlan.get(selectedPlan.id) || []}
            onEdit={() => { setPlanEditing(selectedPlan); setPlanEditOpen(true); }}
            onDelete={() => deletePlan(selectedPlan)}
            onGenerate={() => setGenerateOpen(true)}
            onSequenceClick={(s) => setSelected({ type: 'sequence', id: s.id })}
            onSequenceToggle={toggleSequence}
            onSequenceDelete={(s) => setSeqDelete(s)}
          />
        )}

        {selectedStage && (
          <StageDetailView
            stage={selectedStage}
            usedByPlans={plans.filter(p => p.stages.some(ps => ps.id === selectedStage.id))}
            onEdit={() => { setStageEditing(selectedStage); setStageEditOpen(true); }}
            onDelete={() => deleteStage(selectedStage)}
            onPlanClick={(p) => setSelected({ type: 'plan', id: p.id })}
          />
        )}

        {selectedSequence && (
          <SequenceDetailView
            sequence={selectedSequence}
            plan={plans.find(p => p.id === selectedSequence.sequence_plan_id) || null}
            onPlanClick={(p) => setSelected({ type: 'plan', id: p.id })}
            onToggle={() => toggleSequence(selectedSequence)}
            onDelete={() => setSeqDelete(selectedSequence)}
          />
        )}
      </div>

      {/* ======== DIALOGS ======== */}
      <PlanDialog
        open={planEditOpen}
        onOpenChange={setPlanEditOpen}
        plan={planEditing}
        onDone={loadAll}
      />
      <StageDialog
        open={stageEditOpen}
        onOpenChange={setStageEditOpen}
        stage={stageEditing}
        onDone={loadAll}
      />
      <GenerateSequenceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onDone={loadAll}
      />
      <DeleteSequenceDialog
        target={seqDelete}
        onOpenChange={(o) => { if (!o) setSeqDelete(null); }}
        onDone={() => {
          if (selected?.type === 'sequence' && seqDelete && selected.id === seqDelete.id) {
            setSelected(null);
          }
          loadAll();
        }}
      />
    </div>
  );
}

// ============= Sidebar Helpers =============

function SidebarSection({
  icon, title, count, action, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)]">
        {icon}
        <span className="text-xs font-semibold flex-1">{title}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{count}</span>
        {action}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-[var(--color-text-muted)] px-3 py-2">{children}</div>;
}

// ============= Right Pane Views =============

function EmptyState({ onNewPlan, onNewStage }: { onNewPlan: () => void; onNewStage: () => void }) {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-4">
        <Sparkles className="h-8 w-8 mx-auto text-[var(--color-text-muted)]" />
        <div className="text-sm text-[var(--color-text-muted)]">
          从左侧选择 Plan / Stage / Sequence 查看详情
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={onNewStage}>
            <Plus className="h-3.5 w-3.5" />新建 Stage
          </Button>
          <Button size="sm" onClick={onNewPlan}>
            <Plus className="h-3.5 w-3.5" />新建 Plan
          </Button>
        </div>
        <div className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto pt-4 leading-relaxed">
          <strong>Stage</strong>：概率原子块（定义某段内各 token 出现的概率）<br />
          <strong>Plan</strong>：按顺序组合多个 Stage，定义一场游戏的难度曲线<br />
          <strong>Sequence</strong>：Plan 实例化产出的具体 token 序列，分配给玩家使用
        </div>
      </CardContent>
    </Card>
  );
}

function PlanDetailView({
  plan, sequences, onEdit, onDelete, onGenerate, onSequenceClick, onSequenceToggle, onSequenceDelete,
}: {
  plan: Plan;
  sequences: GeneratedSequence[];
  onEdit: () => void;
  onDelete: () => void;
  onGenerate: () => void;
  onSequenceClick: (s: GeneratedSequence) => void;
  onSequenceToggle: (s: GeneratedSequence) => void;
  onSequenceDelete: (s: GeneratedSequence) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <Badge variant="outline">Plan</Badge>
              </div>
              {plan.description && (
                <div className="text-sm text-[var(--color-text-muted)] mt-1">{plan.description}</div>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />编辑
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm pt-2">
            <KV label="ID" value={plan.id} mono />
            <KV label="阶段数" value={String(plan.stages.length)} />
            <KV label="总长度" value={String(plan.total_length)} />
            <KV label="创建" value={formatDateTime(plan.created_at)} />
            <KV label="更新" value={formatDateTime(plan.updated_at)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">阶段顺序（{plan.stages.length}）</h3>
          {plan.stages.length === 0 ? (
            <div className="text-sm text-[var(--color-text-muted)]">该 Plan 未关联任何 Stage</div>
          ) : (
            <div className="space-y-2">
              {plan.stages
                .sort((a, b) => a.stage_order - b.stage_order)
                .map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-2 bg-[var(--color-surface-2)] rounded border border-[var(--color-border)]"
                  >
                    <span className="font-mono text-xs text-[var(--color-text-muted)] w-8">#{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">长 {s.length}</span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)] max-w-sm truncate">
                      {Object.entries(s.probabilities || {}).map(([k, v]) => `${k}:${v}%`).join(' · ')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">已生成 Sequences（{sequences.length}）</h3>
            <Button size="sm" onClick={onGenerate}>
              <Plus className="h-3.5 w-3.5" />生成序列
            </Button>
          </div>
          {sequences.length === 0 ? (
            <div className="text-sm text-[var(--color-text-muted)]">尚未生成任何 Sequence</div>
          ) : (
            <div className="space-y-1">
              {sequences.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-surface-2)]"
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <span
                    className="font-mono text-xs cursor-pointer hover:text-[var(--color-primary)] flex-1 truncate"
                    onClick={() => onSequenceClick(s)}
                  >
                    {s.id.slice(0, 12)}…
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">长 {s.sequence_length}</span>
                  {s.status === 'enabled' ? (
                    <Badge variant="success">启用</Badge>
                  ) : (
                    <Badge variant="outline">禁用</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onSequenceToggle(s)}>
                    {s.status === 'enabled' ? '禁用' : '启用'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onSequenceDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StageDetailView({
  stage, usedByPlans, onEdit, onDelete, onPlanClick,
}: {
  stage: Stage;
  usedByPlans: Plan[];
  onEdit: () => void;
  onDelete: () => void;
  onPlanClick: (p: Plan) => void;
}) {
  const entries = Object.entries(stage.probabilities || {}).sort((a, b) => {
    const na = a[0] === 'stone' ? Infinity : parseInt(a[0]);
    const nb = b[0] === 'stone' ? Infinity : parseInt(b[0]);
    return na - nb;
  });
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-lg font-semibold">{stage.name}</h2>
                <Badge variant="outline">Stage</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={usedByPlans.length > 0}
                title={usedByPlans.length > 0 ? '被 Plan 引用中，无法删除' : '删除'}
              >
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <KV label="ID" value={stage.id} mono />
            <KV label="长度" value={String(stage.length)} />
            <KV label="创建" value={formatDateTime(stage.created_at)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">概率分布</h3>
            <span className={`text-xs font-mono ${Math.abs(total - 100) < 0.01 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              合计 {total}%
            </span>
          </div>
          <div className="space-y-1.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-14 font-mono text-[var(--color-text-muted)]">{k}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                  <div
                    className={`h-full ${k === 'stone' ? 'bg-orange-400' : 'bg-[var(--color-primary)]'}`}
                    style={{ width: `${v}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono">{v}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">被引用（{usedByPlans.length} 个 Plan）</h3>
          {usedByPlans.length === 0 ? (
            <div className="text-sm text-[var(--color-text-muted)]">该 Stage 尚未被任何 Plan 引用</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {usedByPlans.map(p => (
                <button
                  key={p.id}
                  onClick={() => onPlanClick(p)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--color-surface-2)] hover:bg-[var(--color-primary)]/20 cursor-pointer"
                >
                  <Layers className="h-3 w-3" />{p.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SequenceDetailView({
  sequence, plan, onPlanClick, onToggle, onDelete,
}: {
  sequence: GeneratedSequence;
  plan: Plan | null;
  onPlanClick: (p: Plan) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const data: Array<string | number> = Array.isArray(sequence.sequence_data)
    ? sequence.sequence_data
    : (typeof sequence.sequence_data === 'string'
        ? (() => { try { return JSON.parse(sequence.sequence_data as unknown as string); } catch { return []; } })()
        : []);

  // token 频次统计
  const freq: Record<string, number> = {};
  for (const t of data) {
    const k = String(t);
    freq[k] = (freq[k] || 0) + 1;
  }
  const freqEntries = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-mono">{sequence.id}</h2>
                <Badge variant={sequence.status === 'enabled' ? 'success' : 'outline'}>
                  {sequence.status === 'enabled' ? '启用' : '禁用'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={onToggle}>
                {sequence.status === 'enabled' ? <><Pause className="h-3.5 w-3.5" />禁用</> : <><Play className="h-3.5 w-3.5" />启用</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <KV
              label="Plan"
              valueNode={plan ? (
                <button onClick={() => onPlanClick(plan)} className="text-[var(--color-primary)] hover:underline cursor-pointer">
                  {plan.name}
                </button>
              ) : '-'}
            />
            <KV label="长度" value={String(sequence.sequence_length)} />
            <KV label="创建" value={formatDateTime(sequence.created_at)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Token 频次</h3>
          <div className="space-y-1.5">
            {freqEntries.map(([k, n]) => {
              const pct = (n / data.length) * 100;
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-14 font-mono text-[var(--color-text-muted)]">{k}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <div
                      className={`h-full ${k === 'stone' ? 'bg-orange-400' : 'bg-[var(--color-primary)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono">{n} ({pct.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Token 时间轴（{data.length}）</h3>
          <div className="flex flex-wrap gap-1 max-h-80 overflow-y-auto p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)]">
            {data.length === 0 ? (
              <span className="text-xs text-[var(--color-text-muted)]">（空）</span>
            ) : data.map((t, i) => {
              const isStone = t === 'stone' || t === -1;
              return (
                <span
                  key={i}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isStone ? 'bg-orange-200 text-orange-800' : 'bg-[var(--color-surface-2)]'
                  }`}
                  title={`#${i + 1}: ${t}`}
                >
                  {t}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ label, value, valueNode, mono }: { label: string; value?: string; valueNode?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''}`}>{valueNode ?? value ?? '-'}</div>
    </div>
  );
}
