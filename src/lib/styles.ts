import type { CaseStatus } from '../api/types';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export const STATUS_DOT: Record<CaseStatus, string> = { PASS: 'bg-pass', FAIL: 'bg-fail', BLOCKED: 'bg-blocked', NOT_RUN: 'bg-slate-300' };

export const inputCls =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-4 focus:ring-navy-100';
