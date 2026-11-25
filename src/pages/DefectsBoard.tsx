import { useCallback, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Defect, DefectStatus } from '../api/types';
import { LockedBanner, RunCrumbs } from '../components/RunHeader';
import { Button, Card, DefectPill, ErrorBox, Field, Modal, PageLoading, StatusPill } from '../components/ui';
import { inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { DEFECT_LABEL, fmtDateTime, timeAgo } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';
import { useRunLive } from '../lib/useRun';

const COLUMNS: DefectStatus[] = ['OPEN', 'RETEST_FAILED', 'FIXED', 'RETEST_PASSED', 'CLOSED'];
const COL_TONE: Record<DefectStatus, string> = { OPEN: 'border-t-fail', RETEST_FAILED: 'border-t-fail', FIXED: 'border-t-retest', RETEST_PASSED: 'border-t-pass', CLOSED: 'border-t-slate-400' };

export function DefectsBoard() {
  const { id = '' } = useParams();
  const run = useAsync(() => api.getRun(id), [id]);
  const defects = useAsync(() => api.listRunDefects(id), [id]);
  const [openId, setOpenId] = useState<string | null>(null);
  const live = useCallback(() => {
    void defects.reload();
    void run.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useRunLive(id, live);

  if (run.error || defects.error) return <ErrorBox error={run.error ?? defects.error} onRetry={live} />;
  if (!run.data || !defects.data) return <PageLoading />;
  const selected = defects.data.find((d) => d.id === openId) ?? null;

  return (
    <div>
      <RunCrumbs run={run.data} here="Defects" />
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Defects</h1>
      <LockedBanner run={run.data} />
      <div className="grid gap-4 overflow-x-auto md:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = defects.data!.filter((d) => d.status === col);
          return (
            <div key={col} className={`min-w-[220px] rounded-xl border border-t-4 border-slate-200 bg-slate-100/60 ${COL_TONE[col]}`}>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{DEFECT_LABEL[col]}</span>
                <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-600">{items.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {items.map((d) => (
                  <button key={d.id} onClick={() => setOpenId(d.id)} className="block w-full text-left">
                    <Card className="p-3 hover:border-navy-300">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-fail">{d.code}</span>
                        <span className="rounded bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{d.severity}</span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-sm text-slate-800">{d.title}</p>
                      {d.note && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.note}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{d.assignee?.name ?? 'Not assigned'}</span>
                        <span>{timeAgo(d.createdAt)}</span>
                      </div>
                    </Card>
                  </button>
                ))}
                {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">None</p>}
              </div>
            </div>
          );
        })}
      </div>
      {selected && <DefectModal defect={selected} runId={id} locked={Boolean(run.data.lockedAt)} onClose={() => setOpenId(null)} onChanged={live} />}
    </div>
  );
}

function DefectModal({ defect: d, runId, locked, onClose, onChanged }: { defect: Defect; runId: string; locked: boolean; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const users = useAsync(() => api.listUsers(), []);
  const [fixRef, setFixRef] = useState('');
  const [fixNote, setFixNote] = useState('');
  const [busy, setBusy] = useState(false);
  const canFix = can('ADMIN', 'DEVELOPER') && !locked && (d.status === 'OPEN' || d.status === 'RETEST_FAILED');
  const canEdit = can('ADMIN', 'TESTER', 'DEVELOPER') && !locked;

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast('ok', ok);
      onChanged();
    } catch (x) {
      toast('error', errText(x));
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function fix(e: FormEvent) {
    e.preventDefault();
    await act(() => api.fixDefect(d.id, { version: d.version, fixRef, note: fixNote || null }), `${d.code} marked fixed. Testers will see a retest prompt`);
    setFixRef('');
    setFixNote('');
  }

  return (
    <Modal open title={`${d.code} . ${d.caseKey}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <DefectPill status={d.status} />
          <span className="text-xs text-slate-500">
            Reported by {d.reportedBy ?? 'Unknown'} . {fmtDateTime(d.createdAt)}
          </span>
          <Link to={`/runs/${runId}/test?case=${d.runCaseId}`} className="ml-auto text-sm font-medium text-navy hover:underline">
            Open case
          </Link>
        </div>
        <p className="font-medium text-slate-900">{d.title}</p>
        {d.note && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{d.note}</p>}
        {d.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {d.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                <img src={a.url} alt={a.fileName} className="h-24 w-40 rounded border border-slate-200 object-cover" />
              </a>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assigned to">
            <select
              className={inputCls}
              disabled={!canEdit || busy}
              value={d.assignee?.id ?? ''}
              onChange={(e) => act(() => api.updateDefect(d.id, { version: d.version, assigneeId: e.target.value || null }), 'Assignee saved')}
            >
              <option value="">Not assigned</option>
              {(users.data ?? [])
                .filter((u) => u.active && (u.role === 'DEVELOPER' || u.role === 'ADMIN'))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Severity">
            <select className={inputCls} disabled={!canEdit || busy} value={d.severity} onChange={(e) => act(() => api.updateDefect(d.id, { version: d.version, severity: e.target.value }), 'Severity saved')}>
              {['P1', 'P2', 'P3'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>

        {(d.fixRef || d.retestResult) && (
          <div className="grid gap-3 rounded-lg border border-slate-200 p-3 text-sm sm:grid-cols-2">
            {d.fixRef && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Fix</p>
                <p className="text-slate-800">{d.fixRef}</p>
                <p className="text-xs text-slate-500">
                  {d.fixedBy} . {fmtDateTime(d.fixedAt)}
                </p>
              </div>
            )}
            {d.retestResult && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Retest</p>
                <StatusPill status={d.retestResult} />
                <p className="text-xs text-slate-500">
                  {d.retestedBy} . {fmtDateTime(d.retestedAt)}
                </p>
              </div>
            )}
          </div>
        )}

        {canFix && (
          <form onSubmit={fix} className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
            <p className="text-sm font-semibold text-slate-800">Mark as fixed</p>
            <Field label="Fix reference" hint="Commit, PR or build">
              <input className={inputCls} required value={fixRef} onChange={(e) => setFixRef(e.target.value)} placeholder="PR #42 or a1b2c3d" />
            </Field>
            <Field label="Note for testers">
              <input className={inputCls} value={fixNote} onChange={(e) => setFixNote(e.target.value)} />
            </Field>
            <Button disabled={busy}>Mark fixed</Button>
          </form>
        )}

        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            {d.status !== 'CLOSED' ? (
              <Button variant="secondary" disabled={busy} onClick={() => act(() => api.updateDefect(d.id, { version: d.version, status: 'CLOSED' }), `${d.code} closed`)}>
                Close defect
              </Button>
            ) : (
              <Button variant="secondary" disabled={busy} onClick={() => act(() => api.updateDefect(d.id, { version: d.version, status: 'OPEN' }), `${d.code} reopened`)}>
                Reopen
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
