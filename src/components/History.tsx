import type { CaseEvent } from '../api/types';
import { EVENT_LABEL, fmtDateTime } from '../lib/format';
import { StatusPill } from './ui';
import { cx } from '../lib/styles';

const DOT: Record<string, string> = { result: 'bg-navy', retest: 'bg-retest', fixed: 'bg-retest', defect_opened: 'bg-fail', defect_closed: 'bg-slate-400', defect_reopened: 'bg-fail', import: 'bg-slate-400', screenshot: 'bg-slate-400' };

export function HistoryTimeline({ events, compact }: { events: CaseEvent[]; compact?: boolean }) {
  if (!events.length) return <p className="text-sm text-slate-500">No history yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => {
        const d = (e.data ?? {}) as { defectCode?: string; fixRef?: string };
        return (
          <li key={e.id} className="relative">
            <span className={cx('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white', DOT[e.kind] ?? 'bg-slate-400')} />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-800">{EVENT_LABEL[e.kind] ?? e.kind}</span>
              {e.status && <StatusPill status={e.status} />}
              {d.defectCode && <span className="font-mono text-xs font-semibold text-fail">{d.defectCode}</span>}
            </div>
            <p className="text-xs text-slate-500">
              {e.actorName ?? 'Unknown'} . {fmtDateTime(e.createdAt)}
            </p>
            {d.fixRef && <p className="mt-1 text-sm text-slate-700">Fix: {d.fixRef}</p>}
            {e.note && e.kind !== 'defect_opened' && <p className="mt-1 text-sm text-slate-700">{e.note}</p>}
            {!compact && e.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {e.attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                    <img src={a.url} alt={a.fileName} className="h-16 w-24 rounded border border-slate-200 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
