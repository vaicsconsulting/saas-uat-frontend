import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bug, Download, FileCheck2, FileText, Play, Upload } from 'lucide-react';
import { api } from '../api/client';
import { FileButton } from '../components/FileButton';
import { LockedBanner, RunCrumbs, RunMeta } from '../components/RunHeader';
import { Button, Card, DefectPill, ErrorBox, PageLoading, Progress, StatusPill } from '../components/ui';
import { cx } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { EVENT_LABEL, importSummary, pct, timeAgo } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';
import { useRunLive } from '../lib/useRun';

function Tile({ label, value, tone, sub }: { label: string; value: string | number; tone?: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('mt-1 text-2xl font-semibold', tone ?? 'text-slate-900')}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export function RunDashboard() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const run = useAsync(() => api.getRun(id), [id]);
  const stats = useAsync(() => api.getRunStats(id), [id]);
  const defects = useAsync(() => api.listRunDefects(id), [id]);
  const reloadAll = useCallback(() => {
    void run.reload();
    void stats.reload();
    void defects.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useRunLive(id, reloadAll);

  if (run.error) return <ErrorBox error={run.error} onRetry={run.reload} />;
  if (!run.data || !stats.data) return <PageLoading />;
  const r = run.data;
  const s = stats.data;
  const locked = Boolean(r.lockedAt);
  const openDefects = (defects.data ?? []).filter((d) => ['OPEN', 'FIXED', 'RETEST_FAILED'].includes(d.status));

  return (
    <div>
      <RunCrumbs run={r} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{r.name}</h1>
          <div className="mt-1">
            <RunMeta run={r} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && can('ADMIN', 'TESTER') && (
            <Link to={`/runs/${id}/test`}>
              <Button>
                <Play className="h-4 w-4" /> {s.done ? 'Continue testing' : 'Start testing'}
              </Button>
            </Link>
          )}
          <Link to={`/runs/${id}/defects`}>
            <Button variant="secondary">
              <Bug className="h-4 w-4" /> Defects
            </Button>
          </Link>
          <Link to={`/runs/${id}/report`}>
            <Button variant="secondary">
              <FileText className="h-4 w-4" /> Audit report
            </Button>
          </Link>
          {can('ADMIN') && (
            <Link to={`/runs/${id}/signoff`}>
              <Button variant="secondary">
                <FileCheck2 className="h-4 w-4" /> {locked ? 'Sign-off and links' : 'Sign off'}
              </Button>
            </Link>
          )}
        </div>
      </div>
      <LockedBanner run={r} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Tile label="Done" value={`${s.percentDone}%`} sub={`${s.done} of ${s.total}`} />
        <Tile label="Pass" value={s.pass} tone="text-pass" />
        <Tile label="Fail" value={s.fail} tone="text-fail" />
        <Tile label="Blocked" value={s.blocked} tone="text-blocked" />
        <Tile label="Not run" value={s.notRun} tone="text-slate-500" />
        <Tile label="Pass rate" value={s.passRate === null ? '-' : `${s.passRate}%`} sub="of cases run" />
        <Tile label="Open defects" value={s.openDefects} tone={s.openDefects ? 'text-fail' : undefined} />
        <Tile label="Retest" value={s.needsRetest} tone={s.needsRetest ? 'text-retest' : undefined} sub="waiting" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Progress by module</h2>
          <div className="space-y-3">
            {s.modules.map((m) => (
              <div key={m.module}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate text-slate-700">{m.module}</span>
                  <span className="text-xs text-slate-500">
                    {m.total - m.notRun}/{m.total}
                  </span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" title={`Pass ${m.pass}, Fail ${m.fail}, Blocked ${m.blocked}, Not run ${m.notRun}`}>
                  <div className="bg-pass" style={{ width: `${pct(m.pass, m.total)}%` }} />
                  <div className="bg-fail" style={{ width: `${pct(m.fail, m.total)}%` }} />
                  <div className="bg-blocked" style={{ width: `${pct(m.blocked, m.total)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-pass" /> Pass
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-fail" /> Fail
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-blocked" /> Blocked
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-slate-200" /> Not run
            </span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Who tested what</h2>
            {s.testers.length === 0 ? (
              <p className="text-sm text-slate-500">No results yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {s.testers.map((t) => (
                  <li key={t.name}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-800">{t.name}</span>
                      <span className="text-slate-500">{t.count} cases</span>
                    </div>
                    <Progress value={pct(t.count, s.done)} className="mt-1 h-1.5" />
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.pass} pass, {t.fail} fail, {t.blocked} blocked
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Latest activity</h2>
            <ul className="space-y-2 text-sm">
              {s.recent.slice(0, 8).map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-navy">{e.caseKey}</span>
                  {e.status ? <StatusPill status={e.status} /> : <span className="text-xs text-slate-600">{EVENT_LABEL[e.kind] ?? e.kind}</span>}
                  <span className="truncate text-xs text-slate-500">{e.actorName}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">{timeAgo(e.createdAt)}</span>
                </li>
              ))}
              {s.recent.length === 0 && <li className="text-slate-500">Nothing yet.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Open defects ({openDefects.length})</h2>
          <Link to={`/runs/${id}/defects`} className="text-sm font-medium text-navy hover:underline">
            Open board
          </Link>
        </div>
        {openDefects.length === 0 ? (
          <p className="text-sm text-slate-500">No open defects.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openDefects.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 font-mono text-xs font-semibold text-fail">{d.code}</span>
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                <span className="hidden text-xs text-slate-500 sm:block">{d.assignee?.name ?? 'Not assigned'}</span>
                <DefectPill status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-600">Excel and Word:</span>
        <Button size="sm" variant="secondary" onClick={() => api.exportRun(id).catch((x) => toast('error', errText(x)))}>
          <Download className="h-4 w-4" /> Export tracker (.xlsx)
        </Button>
        {!locked && can('ADMIN', 'TESTER') && (
          <>
            <FileButton
              accept=".xlsx"
              label="Import results (.xlsx)"
              icon={<Upload className="h-4 w-4" />}
              onFile={async (f) => {
                try {
                  toast('ok', importSummary(await api.importResults(id, f)));
                  reloadAll();
                } catch (x) {
                  toast('error', errText(x));
                }
              }}
            />
            <FileButton
              accept=".docx"
              label="Import screenshots (.docx)"
              icon={<Upload className="h-4 w-4" />}
              onFile={async (f) => {
                try {
                  const res = await api.importDocx(id, f);
                  toast('ok', `${res.created} screenshots matched${res.skipped ? `, ${res.skipped} skipped` : ''}`);
                  reloadAll();
                } catch (x) {
                  toast('error', errText(x));
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
