import { useState, FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import { login } from '@/api/client';

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await login(username.trim(), password);
      toast.success('登录成功');
      onLoggedIn();
    } catch (err) {
      const message = (err as { error?: string })?.error || '登录失败';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-bg)] font-[Inter,system-ui,sans-serif] text-[var(--color-text)]">
      <form
        onSubmit={onSubmit}
        className="w-[360px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[28px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]"
      >
        <div className="mb-[24px] text-center">
          <div className="font-[Fredoka,system-ui,sans-serif] text-[1.375rem] font-bold text-[var(--color-brand)]">
            Giant 2048
          </div>
          <div className="text-[0.75rem] text-[var(--color-text-dimmest)]">Admin · 登录</div>
        </div>

        <label className="mb-[14px] block">
          <div className="mb-[6px] text-[0.75rem] font-medium text-[var(--color-text-secondary)]">用户名</div>
          <input
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] px-[12px] py-[8px] text-[0.875rem] text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
            placeholder="admin"
            disabled={busy}
          />
        </label>

        <label className="mb-[20px] block">
          <div className="mb-[6px] text-[0.75rem] font-medium text-[var(--color-text-secondary)]">密码</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] px-[12px] py-[8px] text-[0.875rem] text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
            placeholder="••••••"
            disabled={busy}
          />
        </label>

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="flex w-full cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border-0 bg-[var(--color-brand)] px-[12px] py-[10px] text-[0.875rem] font-semibold text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn size={14} />
          <span>{busy ? '登录中…' : '登录'}</span>
        </button>
      </form>
    </div>
  );
}
