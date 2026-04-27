import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { AdminUser, GeneratedSequence, SequencesResp } from '@/api/types';
import { PageHeader } from '@/components/ui/page-header';
import { RefreshBtn } from '@/components/ui/refresh-btn';

const TH = { padding: '10px 12px', fontSize: '0.6562rem', color: '#8a8a94', textTransform: 'uppercase' as const, letterSpacing: 0.6, fontWeight: 500, borderBottom: '1px solid #ececf2', textAlign: 'left' as const };
const TD = { padding: '12px 12px', borderBottom: '1px solid #f0f0f4', fontSize: '0.75rem', wordBreak: 'break-all' as const };

interface EditState {
  id: string | null; // null = creating
  kol_user_id: string;
  user_id: string;
  platform_id: string;
  sequence_id: string;
  note: string;
}

const EMPTY_EDIT: EditState = { id: null, kol_user_id: '', user_id: '', platform_id: '', sequence_id: '', note: '' };

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sequences, setSequences] = useState<GeneratedSequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        api<{ users: AdminUser[] }>('/api/admin/users'),
        api<SequencesResp>('/api/admin/generated-sequences?page=1&limit=1000'),
      ]);
      setUsers(u.users);
      setSequences(s.sequences);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const body = {
        kol_user_id: edit.kol_user_id,
        user_id: edit.user_id,
        platform_id: edit.platform_id,
        sequence_id: edit.sequence_id,
        note: edit.note,
      };
      if (edit.id) {
        await api(`/api/admin/users/${edit.id}`, { method: 'PUT', body });
      } else {
        await api('/api/admin/users', { method: 'POST', body });
      }
      toast.success('已保存');
      setEdit(null);
      await load();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`删除用户配置 ${u.user_id || u.id}？`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      toast.success('已删除');
      await load();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  return (
    <div style={{ padding: 22, height: '100%', overflow: 'auto' }}>
      <PageHeader
        title="用户管理"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setEdit({ ...EMPTY_EDIT })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.7812rem', border: '1px solid #2a2a33', borderRadius: 6, background: '#2a2a33', color: '#fff', cursor: 'pointer' }}
            >
              <Plus size={13} />
              新建用户
            </button>
            <RefreshBtn onClick={() => void load()} loading={loading} />
          </div>
        }
      />

      <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafc' }}>
            <tr>
              <th style={TH}>User ID</th>
              <th style={TH}>KOL User ID</th>
              <th style={TH}>Platform ID</th>
              <th style={TH}>系列名称</th>
              <th style={TH}>备注</th>
              <th style={TH}>创建时间</th>
              <th style={{ ...TH, textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} style={{ ...TD, textAlign: 'center', color: '#9b9ba6', padding: '32px 12px' }}>{loading ? '加载中…' : '暂无用户'}</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td style={{ ...TD, color: '#2a2a33', fontWeight: 500 }}>{u.user_id || '—'}</td>
                <td style={TD}>{u.kol_user_id || '—'}</td>
                <td style={TD}>{u.platform_id || '—'}</td>
                <td style={TD}>{u.sequence_name || '—'}</td>
                <td style={{ ...TD, color: '#5a5a66' }}>{u.note || '—'}</td>
                <td style={{ ...TD, color: '#9b9ba6', fontSize: '0.6875rem' }}>{new Date(u.created_at).toLocaleString('zh-CN', { hour12: false })}</td>
                <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => setEdit({ id: u.id, kol_user_id: u.kol_user_id, user_id: u.user_id, platform_id: u.platform_id, sequence_id: u.sequence_id, note: u.note })} style={{ padding: 6, marginRight: 6, border: '1px solid #ececf2', borderRadius: 4, background: '#fff', cursor: 'pointer' }} title="编辑"><Pencil size={13} /></button>
                  <button type="button" onClick={() => void remove(u)} style={{ padding: 6, border: '1px solid #ececf2', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#c8343a' }} title="删除"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <>
          <div onClick={() => setEdit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,24,0.35)', zIndex: 80 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '60vw', maxWidth: 600, background: 'var(--color-bg)', zIndex: 90, padding: 22, overflow: 'auto', boxShadow: '-12px 0 32px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20, fontFamily: 'Fredoka, system-ui, sans-serif' }}>
                {edit.id ? '编辑用户' : '新建用户'}
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="User ID" value={edit.user_id} onChange={(v) => setEdit({ ...edit, user_id: v })} />
                <Field label="KOL User ID" value={edit.kol_user_id} onChange={(v) => setEdit({ ...edit, kol_user_id: v })} />
                <Field label="Platform ID" value={edit.platform_id} onChange={(v) => setEdit({ ...edit, platform_id: v })} />
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>序列</div>
                  <select value={edit.sequence_id} onChange={(e) => setEdit({ ...edit, sequence_id: e.target.value })} style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none' }}>
                    <option value="">（未指定，按分布表选）</option>
                    {sequences.map((s) => (
                      <option key={s.id} value={s.id}>{s.sequence_name || s.id}{s.plan_name ? ` · ${s.plan_name}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>备注</div>
                  <textarea value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} rows={3} style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', resize: 'vertical', minHeight: 64 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" onClick={() => setEdit(null)} style={{ padding: '7px 14px', fontSize: '0.7812rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', cursor: 'pointer' }}>取消</button>
                <button type="button" onClick={() => void save()} disabled={saving} style={{ padding: '7px 14px', fontSize: '0.7812rem', border: '1px solid #2a2a33', borderRadius: 6, background: '#2a2a33', color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>保存</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none' }} />
    </div>
  );
}
