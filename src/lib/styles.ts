import type { CaseStatus } from '../api/types';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export const STATUS_DOT: Record<CaseStatus, string> = { PASS: 'bg-pass', FAIL: 'bg-fail', BLOCKED: 'bg-blocked', NOT_RUN: 'bg-slate-300' };

export const inputCls =
  'block w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-slate-400 focus:border-deep focus:outline-none';
