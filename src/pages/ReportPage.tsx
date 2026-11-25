import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Lock } from 'lucide-react';
import { api } from '../api/client';
import type { AuditReport } from '../api/types';
import { brand } from '../brand';
import { Button, DefectPill, ErrorBox, PageLoading, StatusPill } from '../components/ui';
import { fmtDate, fmtDateTime, pct } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

export function ReportPage() {
  const { id = '' } = useParams();
  const q = useAsync(() => api.getReport(id), [id]);
  if (q.error) return <div className="p-6"><ErrorBox error={q.error} onRetry={q.reload} /></div>;
  if (!q.data) return <PageLoading />;
  return (
    <ReportView
      report={q.data}
      onPdf={() => api.downloadReportPdf(id)}
      back={
        <Link to={`/runs/${id}`} className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to run
        </Link>
      }
    />
  );
}

export function PublicReportPage() {
  const { token = '' } = useParams();
  const q = useAsync(() => api.publicReport(token), [token]);
  if (q.error)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <img src={brand.logo} alt="" className="mx-auto mb-4 h-10 w-10" />
          <h1 className="text-lg font-semibold text-slate-900">This link does not work</h1>
          <p className="mt-1 text-sm text-slate-500">{errText(q.error)}. Ask {brand.company} for a new link.</p>
        </div>
      </div>
    );
  if (!q.data) return <PageLoading />;
  return <ReportView report={q.data} onPdf={() => api.downloadPublicPdf(token)} note={`Read-only link. Valid until ${fmtDate(q.data.shareExpiresAt)}.`} />;
}

function ReportView({ report: r, onPdf, back, note }: { report: AuditReport; onPdf: () => Promise<void>; back?: React.ReactNode; note?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const s = r.stats;
  const client = r.client.name ?? 'Client';
  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="no-print sticky top-0 z-20 flex h-14 items-center gap-4 bg-navy px-4">
        {back}
        <span className="text-sm text-white/80">{note}</span>
        <Button
          className="ml-auto"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onPdf();
            } catch (x) {
              toast('error', errText(x));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download className="h-4 w-4" /> {busy ? 'Preparing PDF...' : 'Download PDF'}
        </Button>
      </div>

      <article className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-xl bg-white shadow-card print:mt-0 print:shadow-none">
        {/* Cover */}
        <header className="bg-navy px-10 py-10 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                <img src={brand.logo} alt="" className="h-6 w-6 rounded ring-1 ring-white/30" /> {r.brand.company}
              </p>
              <h1 className="mt-6 text-4xl font-semibold">UAT Report</h1>
              <p className="mt-2 text-lg text-white/90">
                {r.project.name} for {client}
              </p>
              <p className="mt-1 text-sm text-white/70">Prepared by {r.brand.company}</p>
            </div>
            {r.client.logoUrl && <img src={r.client.logoUrl} alt={client} className="max-h-16 max-w-[140px] rounded bg-white p-2" />}
          </div>
        </header>
        <section className="grid grid-cols-2 gap-x-8 gap-y-3 border-b border-slate-200 px-10 py-6 text-sm md:grid-cols-3">
          {[
            ['Client', client],
            ['Application', `${r.project.name} (${r.project.key})`],
            ['Test run', r.run.name],
            ['Environment', r.run.environment],
            ['Build / version', r.run.buildTag ?? 'Not set'],
            ['Test window', `${fmtDate(r.run.windowStart)} to ${r.run.windowEnd ? fmtDate(r.run.windowEnd) : 'ongoing'}`],
            ['Testers', r.testers.join(', ') || 'None yet'],
            ['Report ID', r.reportId],
            ['Status', r.locked ? 'Signed off and locked' : 'Draft, not signed off'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-slate-500">{k}</p>
              <p className="font-medium text-slate-900">{v}</p>
            </div>
          ))}
        </section>

        {/* Summary */}
        <section className="px-10 py-6">
          <h2 className="mb-4 border-b-2 border-navy pb-1 text-lg font-semibold text-navy">Summary</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {[
              ['Total', s.total, 'text-slate-900'],
              ['Pass', s.pass, 'text-pass'],
              ['Fail', s.fail, 'text-fail'],
              ['Blocked', s.blocked, 'text-blocked'],
              ['Not run', s.notRun, 'text-slate-500'],
              ['Pass rate', s.passRate === null ? '-' : `${s.passRate}%`, 'text-navy'],
            ].map(([k, v, tone]) => (
              <div key={k as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <p className={`text-2xl font-semibold ${tone}`}>{v}</p>
                <p className="text-xs text-slate-500">{k}</p>
              </div>
            ))}
          </div>
          <table className="mt-5 w-full text-sm">
            <thead className="bg-navy text-left text-xs text-white">
              <tr>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-center">Pass</th>
                <th className="px-3 py-2 text-center">Fail</th>
                <th className="px-3 py-2 text-center">Blocked</th>
                <th className="px-3 py-2 text-center">Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.modules.map((m) => (
                <tr key={m.module}>
                  <td className="px-3 py-1.5">{m.module}</td>
                  <td className="px-3 py-1.5 text-center">{m.total}</td>
                  <td className="px-3 py-1.5 text-center text-pass">{m.pass}</td>
                  <td className="px-3 py-1.5 text-center text-fail">{m.fail}</td>
                  <td className="px-3 py-1.5 text-center text-blocked">{m.blocked}</td>
                  <td className="px-3 py-1.5 text-center">{pct(m.total - m.notRun, m.total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cases */}
        <section className="px-10 py-6">
          <h2 className="mb-4 border-b-2 border-navy pb-1 text-lg font-semibold text-navy">Test cases</h2>
          <div className="divide-y divide-slate-200">
            {r.cases.map((c) => (
              <div key={c.caseKey} className="print-break py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-16 shrink-0 font-mono text-xs font-bold text-navy">{c.caseKey}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {c.module} . {c.priority} . {c.type}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-500">Actual: </span>
                      {c.actualResult || (c.status === 'NOT_RUN' ? 'Not run' : 'As expected')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.testedBy ? `Tested by ${c.testedBy} on ${fmtDateTime(c.testedAt)}` : 'Not tested'}
                      {c.defectCodes.length > 0 && <span className="ml-2 font-mono font-semibold text-fail">{c.defectCodes.join(', ')}</span>}
                    </p>
                    {c.screenshots.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {c.screenshots.map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={`${c.caseKey} screenshot`} className="max-h-56 w-full rounded border border-slate-200 object-contain" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <StatusPill status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Defects */}
        <section className="px-10 py-6">
          <h2 className="mb-4 border-b-2 border-navy pb-1 text-lg font-semibold text-navy">Defects, fixes and retests</h2>
          {r.defects.length === 0 ? (
            <p className="text-sm text-slate-500">No defects were logged in this run.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-navy text-left text-xs text-white">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Summary</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Fix</th>
                  <th className="px-3 py-2">Retest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {r.defects.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs font-bold text-fail">{d.code}</td>
                    <td className="px-3 py-2">
                      <p className="text-slate-900">{d.title}</p>
                      {d.note && <p className="text-xs text-slate-500">{d.note}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <DefectPill status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{d.fixRef ? `${d.fixRef}. ${d.fixedBy ?? ''} ${fmtDate(d.fixedAt)}` : ''}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{d.retestResult ? `${d.retestResult === 'PASS' ? 'Pass' : 'Fail'}. ${d.retestedBy ?? ''} ${fmtDate(d.retestedAt)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Sign-off */}
        <section className="px-10 py-6">
          <h2 className="mb-4 border-b-2 border-navy pb-1 text-lg font-semibold text-navy">Sign-off</h2>
          {r.signOffs.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {['Prepared by', 'Tested by', 'Reviewed by', 'Approved by'].map((x) => (
                <div key={x} className="rounded-lg border border-dashed border-slate-300 p-4">
                  <p className="text-xs text-slate-500">{x}</p>
                  <div className="mt-8 border-t border-slate-300 pt-1 text-xs text-slate-400">Name, role, date</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {r.signOffs.map((x) => (
                <div key={x.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{x.name}</p>
                  <p className="text-sm text-slate-600">
                    {x.role}
                    {x.company ? `, ${x.company}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Signed {fmtDateTime(x.signedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 bg-slate-50 px-10 py-5 text-xs text-slate-500">
          {r.locked ? (
            <p className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Signed off and locked. No edits after sign-off. All earlier changes are kept in the audit log. Report {r.reportId}
                {r.reportHash && (
                  <>
                    , SHA-256 <span className="break-all font-mono">{r.reportHash}</span>
                  </>
                )}
                .
              </span>
            </p>
          ) : (
            <p>Draft report {r.reportId}. Not signed off yet.</p>
          )}
          <p className="mt-1">Generated {fmtDateTime(r.generatedAt)} (India time)</p>
        </footer>
      </article>
    </div>
  );
}
