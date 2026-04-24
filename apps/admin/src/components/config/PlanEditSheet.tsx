import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Plan } from '@/api/types';
import { AdminV4_Spreadsheet } from '@/components/config/AdminV4_Spreadsheet';

export interface PlanEditSheetProps {
  open: boolean;
  mode: 'new' | 'edit';
  initialPlan: Plan | null;
  onClose: () => void;
  onSaved: (saved: Plan) => void;
}

export function PlanEditSheet({ open, mode, initialPlan, onClose, onSaved }: PlanEditSheetProps) {
  useEffect(() => {
    if (document.getElementById('plan-edit-sheet-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'plan-edit-sheet-keyframes';
    style.textContent = '@keyframes planSheetOverlayIn { from { opacity: 0; } to { opacity: 1; } } @keyframes planSheetSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }';
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16,16,24,0.35)',
          zIndex: 40,
          animation: 'planSheetOverlayIn 200ms ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '85vw',
          maxWidth: 1280,
          background: 'var(--color-bg)',
          zIndex: 50,
          boxShadow: '-12px 0 32px rgba(0,0,0,0.12)',
          animation: 'planSheetSlideIn 300ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: 14,
            right: '100%',
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid #ececf2',
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
        <div style={{ flex: 1, minHeight: 0 }}>
          <AdminV4_Spreadsheet
            initialPlan={initialPlan}
            mode={mode}
            onCancel={onClose}
            onSave={(saved) => {
              onSaved(saved);
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
