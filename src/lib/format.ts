import type { CaseStatus, DefectStatus, ImportResult, Role } from '../api/types';

const TZ = 'Asia/Kolkata';

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return fmtDate(iso);
}

export const STATUS_LABEL: Record<CaseStatus, string> = { NOT_RUN: 'Not run', PASS: 'Pass', FAIL: 'Fail', BLOCKED: 'Blocked' };
export const DEFECT_LABEL: Record<DefectStatus, string> = { OPEN: 'Open', FIXED: 'Fixed', RETEST_PASSED: 'Retest passed', RETEST_FAILED: 'Retest failed', CLOSED: 'Closed' };
export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', TESTER: 'Tester', DEVELOPER: 'Developer', VIEWER: 'Viewer' };

export const EVENT_LABEL: Record<string, string> = {
  result: 'Result',
  retest: 'Retest',
  fixed: 'Marked fixed',
  defect_opened: 'Defect opened',
  defect_closed: 'Defect closed',
  defect_reopened: 'Defect reopened',
  import: 'Imported',
  screenshot: 'Screenshot added',
};

export function joinUrl(base: string | null | undefined, path: string | null | undefined): string | null {
  if (!base) return null;
  const b = base.replace(/\/$/, '');
  if (!path || path === '/' || !path.startsWith('/')) return b + (path && path.startsWith('/') ? path : '');
  return b + path;
}

export function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function importSummary(r: ImportResult) {
  const parts = [r.created && `${r.created} added`, r.updated && `${r.updated} updated`, r.skipped && `${r.skipped} skipped`].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Nothing to import';
}
