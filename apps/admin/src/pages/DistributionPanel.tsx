import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { DistributionItem, GeneratedSequence, SequencesResp } from '@/api/types';

const TH = { padding: '10px 12px', fontSize: '0.6562rem', color: '#8a8a94', textTransform: 'uppercase' as const, letterSpacing: 0.6, fontWeight: 500, borderBottom: '1px solid #ececf2', textAlign: 'left' as const };
const TD = { padding: '12px 12px', borderBottom: '1px solid #f0f0f4', fontSize: '0.75rem' };

export function DistributionPanel() {
  const [items, setItems] = useState<DistributionItem[]>([]);
  const [sequences, setSequences] = useState<GeneratedSequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSeq, setNewSeq] = useState('');
  // ratio 输入用字符串保存，允许清空让用户重新输入；提交时再解析
  const [newRatio, setNewRatio] = useState<string>('10');
  // 已存在条目的 ratio 编辑也用 string，按 id 维护
  const [ratioDrafts, setRatioDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        api<{ items: DistributionItem[] }>('/api/admin/distribution'),
        api<SequencesResp>('/api/admin/generated-sequences?page=1&limit=1000'),
      ]);
      setItems(d.items);
      setSequences(s.sequences);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const totalRatio = useMemo(() => items.reduce((s, i) => s + (i.ratio || 0), 0), [items]);

  async function addItem() {
    if (!newSeq) { toast.error('请选择序列'); return; }
    const r = parseInt(newRatio);
    if (!Number.isFinite(r) || r <= 0) { toast.error('权重必须是大于 0 的正整数'); return; }
    setAdding(true);
    try {
      await api('/api/admin/distribution', { method: 'POST', body: { sequence_id: newSeq, ratio: r } });
      toast.success('已添加');
      setNewSeq('');
      setNewRatio('10');
      await load();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '添加失败');
    } finally {
      setAdding(false);
    }
  }

  async function updateRatio(item: DistributionItem, ratio: number) {
    if (ratio <= 0) return;
    try {
      await api(`/api/admin/distribution/${item.id}`, { method: 'PUT', body: { ratio } });
      await load();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '更新失败');
    }
  }

  async function remove(item: DistributionItem) {
    if (!confirm(`移除「${item.sequence_name || item.sequence_id}」（权重 ${item.ratio}）？`)) return;
    try {
      await api(`/api/admin/distribution/${item.id}`, { method: 'DELETE' });
      toast.success('已移除');
      await load();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  return (
    <div style={{ padding: 22, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#2a2a33' }}>全局分布</div>
        <div style={{ fontSize: '0.75rem', color: '#6a6a74', marginTop: 4 }}>
          当用户没有显式 user 配置时，按下面的权重加权随机选择 sequence。权重为正整数，按相对比值分配；总权重 <b>{totalRatio}</b>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafc' }}>
            <tr>
              <th style={TH}>系列名称</th>
              <th style={TH}>所属 Plan</th>
              <th style={{ ...TH, textAlign: 'right', width: 150 }}>权重</th>
              <th style={{ ...TH, textAlign: 'right', width: 110 }}>占比</th>
              <th style={{ ...TH, textAlign: 'right', width: 80 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#9b9ba6', padding: '32px 12px' }}>{loading ? '加载中…' : '暂无分布配置'}</td></tr>
            ) : items.map((item) => {
              const pct = totalRatio > 0 ? ((item.ratio / totalRatio) * 100).toFixed(1) : '—';
              return (
                <tr key={item.id}>
                  <td style={{ ...TD, color: '#2a2a33', fontWeight: 500 }}>{item.sequence_name || item.sequence_id}</td>
                  <td style={{ ...TD, color: '#5a5a66' }}>{item.plan_name || '—'}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ratioDrafts[item.id] ?? String(item.ratio)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // 允许任意字符串（包括 ""）；非法字符过滤掉但保留空字符串
                        const filtered = raw.replace(/[^0-9]/g, '');
                        setRatioDrafts((prev) => ({ ...prev, [item.id]: filtered }));
                      }}
                      onBlur={() => {
                        const draft = ratioDrafts[item.id];
                        if (draft === undefined) return;
                        const v = parseInt(draft);
                        if (!Number.isFinite(v) || v <= 0) {
                          // 空 / 非法 → 还原为已保存的值
                          toast.error('权重必须是大于 0 的正整数');
                          setRatioDrafts((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                          return;
                        }
                        if (v !== item.ratio) {
                          void updateRatio(item, v);
                        }
                        setRatioDrafts((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }}
                      style={{ width: 80, padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #e6e6ec', borderRadius: 4, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#5a5a66' }}>{pct}%</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button type="button" onClick={() => void remove(item)} style={{ padding: 6, border: '1px solid #ececf2', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#c8343a' }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 12 }}>添加分布</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 4 }}>序列</div>
            <select value={newSeq} onChange={(e) => setNewSeq(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none' }}>
              <option value="">请选择…</option>
              {sequences.filter((s) => s.status === 'enabled').map((s) => (
                <option key={s.id} value={s.id}>{s.sequence_name || s.id}{s.plan_name ? ` · ${s.plan_name}` : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 4 }}>权重</div>
            <input
              type="text"
              inputMode="numeric"
              value={newRatio}
              onChange={(e) => setNewRatio(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="如 10"
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, outline: 'none' }}
            />
          </div>
          <button type="button" onClick={() => void addItem()} disabled={adding} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.7812rem', border: '1px solid #2a2a33', borderRadius: 6, background: '#2a2a33', color: '#fff', cursor: adding ? 'wait' : 'pointer' }}>
            <Plus size={13} />
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
