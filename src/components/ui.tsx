import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { CaseStatus, DefectStatus } from '../api/types';
import { DEFECT_LABEL, STATUS_LABEL } from '../lib/format';
import { cx } from '../lib/styles';


type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'pass' | 'fail' | 'blocked';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-800 focus-visible:ring-navy-300',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus-visible:ring-navy-200',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:ring-navy-200',
  danger: 'bg-fail text-white hover:opacity-90 focus-visible:ring-red-200',
  pass: 'bg-pass text-white hover:opacity-90 focus-visible:ring-green-200',
  fail: 'bg-fail text-white hover:opacity-90 focus-visible:ring-red-200',
  blocked: 'bg-blocked text-white hover:opacity-90 focus-visible:ring-amber-200',
};

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-4 text-sm',
        VARIANT[variant],
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-card', className)}>{children}</div>;
}

const STATUS_STYLE: Record<CaseStatus, string> = {
  PASS: 'bg-green-50 text-pass ring-green-600/20',
  FAIL: 'bg-red-50 text-fail ring-red-600/20',
  BLOCKED: 'bg-amber-50 text-blocked ring-amber-600/20',
  NOT_RUN: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export function StatusPill({ status, className }: { status: CaseStatus; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLE[status], className)}>{STATUS_LABEL[status]}</span>;
}

const DEFECT_STYLE: Record<DefectStatus, string> = {
  OPEN: 'bg-red-50 text-fail ring-red-600/20',
  FIXED: 'bg-violet-50 text-retest ring-violet-600/20',
  RETEST_PASSED: 'bg-green-50 text-pass ring-green-600/20',
  RETEST_FAILED: 'bg-red-100 text-fail ring-red-600/30',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export function DefectPill({ status }: { status: DefectStatus }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', DEFECT_STYLE[status])}>{DEFECT_LABEL[status]}</span>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700', className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-label="Loading" />;
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-slate-500">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {msg}
      {onRetry && (
        <button className="ml-3 font-semibold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}


export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16" onMouseDown={onClose}>
      <div className={cx('w-full rounded-xl bg-white shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Progress({ value, className, color = 'bg-navy' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{children}</kbd>;
}
