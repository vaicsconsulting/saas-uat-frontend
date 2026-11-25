import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Copy, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { LockedBanner, RunCrumbs } from '../components/RunHeader';
import { Button, Card, ErrorBox, Field, PageLoading } from '../components/ui';
import { inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { brand } from '../brand';
import { fmtDate, fmtDateTime } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

interface Signer {
  name: string;
  role: string;
  company: string;
}

export function SignOffPage() {
  const { id = '' } = useParams();
  const { can, user } = useAuth();
  const toast = useToast();
  const run = useAsync(() => api.getRun(id), [id]);
  const stats = useAsync(() => api.getRunStats(id), [id]);
  const links = useAsync(() => api.listShareLinks(id), [id]);
  const log = useAsync(() => api.getAuditLog(id), [id]);
  const [signers, setSigners] = useState<Signer[]>([
    { name: user?.name ?? '', role: 'QA lead', company: brand.company },
    { name: '', role: 'Client approver', company: '' },
  ]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [days, setDays] = useState(14);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  if (!can('ADMIN')) return <ErrorBox error={new Error('Only admins can sign off')} />;
  if (run.error || stats.error) return <ErrorBox error={run.error ?? stats.error} />;
  if (!run.data || !stats.data) return <PageLoading />;
  const r = run.data;
  const s = stats.data;
  const locked = Boolean(r.lockedAt);
  const checks = [
    { ok: s.notRun === 0, text: s.notRun === 0 ? 'Every case has a result' : `${s.notRun} cases are not run yet` },
    { ok: s.needsRetest === 0, text: s.needsRetest === 0 ? 'No retests waiting' : `${s.needsRetest} cases wait for a retest` },
    { ok: s.openDefects === 0, text: s.openDefects === 0 ? 'No open defects' : `${s.openDefects} defects still open. Agree them with the client before sign-off`, soft: true },
  ];
  const blocked = checks.some((c) => !c.ok && !c.soft);

  async function sign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.signOff(id, { signers: signers.filter((x) => x.name.trim()).map((x) => ({ name: x.name, role: x.role, company: x.company || null })), confirm: true });
      toast('ok', 'Signed off. The run is now locked');
      run.reload();
      log.reload();
    } catch (x) {
      toast('error', errText(x));
    } finally {
      setBusy(false);
    }
  }

  async function share(e: FormEvent) {
    e.preventDefault();
    try {
      const l = await api.createShareLink(id, { label, expiresInDays: days });
      setNewUrl(l.url ?? null);
      setLabel('');
      links.reload();
    } catch (x) {
      toast('error', errText(x));
    }
  }

  return (
    <div className="max-w-4xl">
      <RunCrumbs run={r} here="Sign-off" />
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Sign-off and client links</h1>
      <LockedBanner run={r} />

      {!locked && (
        <Card className="mb-6 p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Before you sign</h2>
          <ul className="mb-5 space-y-2">
            {checks.map((c) => (
              <li key={c.text} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-pass" /> : <AlertTriangle className={c.soft ? 'h-4 w-4 text-blocked' : 'h-4 w-4 text-fail'} />}
                <span className={c.ok ? 'text-slate-700' : 'text-slate-900'}>{c.text}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={sign} className="space-y-3">
            {signers.map((sg, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <Field label={i === 0 ? 'Name' : ''}>
                  <input className={inputCls} required={i === 0} value={sg.name} onChange={(e) => setSigners(signers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                </Field>
                <Field label={i === 0 ? 'Role' : ''}>
                  <input className={inputCls} required={Boolean(sg.name)} value={sg.role} onChange={(e) => setSigners(signers.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
                </Field>
                <Field label={i === 0 ? 'Company' : ''}>
                  <input className={inputCls} value={sg.company} onChange={(e) => setSigners(signers.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))} />
                </Field>
                <button type="button" className="mb-2 rounded p-1 text-slate-400 hover:text-fail" onClick={() => setSigners(signers.filter((_, j) => j !== i))} disabled={signers.length === 1} title="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setSigners([...signers, { name: '', role: '', company: '' }])}>
              <Plus className="h-4 w-4" /> Add signer
            </Button>
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              After sign-off this run is locked. Results, defects and screenshots can no longer change.
            </label>
            <Button disabled={!confirm || busy || blocked}>{busy ? 'Signing...' : 'Sign off and lock'}</Button>
          </form>
        </Card>
      )}

      <Card className="mb-6 p-5">
        <h2 className="mb-1 font-semibold text-slate-900">Client links</h2>
        <p className="mb-4 text-sm text-slate-500">A read-only report link for one client. It stops working when it expires or you revoke it.</p>
        <form onSubmit={share} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Who is it for">
              <input className={inputCls} required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Plus Project, audit team" />
            </Field>
          </div>
          <Field label="Valid for">
            <select className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[3, 7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </Field>
          <Button>Create link</Button>
        </form>
        {newUrl && (
          <div className="mt-4 flex gap-2 rounded-lg bg-navy-50 p-3">
            <input readOnly value={newUrl} className={inputCls} onFocus={(e) => e.target.select()} />
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(newUrl);
                toast('ok', 'Link copied. It is shown only once');
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-slate-100">
          {(links.data ?? []).map((l) => {
            const expired = new Date(l.expiresAt) < new Date();
            return (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{l.label}</span>
                <span className="font-mono text-xs text-slate-400">...{l.tokenHint}</span>
                <span className="text-xs text-slate-500">{l.revokedAt ? 'Revoked' : expired ? 'Expired' : `Until ${fmtDate(l.expiresAt)}`}</span>
                {l.lastUsedAt && <span className="text-xs text-slate-400">Opened {fmtDateTime(l.lastUsedAt)}</span>}
                {!l.revokedAt && !expired && (
                  <button className="ml-auto text-xs font-medium text-fail hover:underline" onClick={() => api.revokeShareLink(l.id).then(() => links.reload())}>
                    Revoke
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Audit log</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {(log.data ?? [])
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-xs text-slate-500">{fmtDateTime(e.createdAt)}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-navy">{e.action}</td>
                    <td className="py-1.5 pr-3 text-slate-700">{e.actorName}</td>
                    <td className="truncate py-1.5 text-xs text-slate-500">{summarize(e.data)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {log.data?.length === 0 && <p className="text-sm text-slate-500">No changes yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function summarize(d: unknown): string {
  if (!d || typeof d !== 'object') return '';
  const o = d as Record<string, unknown>;
  return ['caseKey', 'code', 'to', 'fixRef', 'label', 'name']
    .filter((k) => o[k] !== undefined && o[k] !== null)
    .map((k) => String(o[k]))
    .join(' . ');
}
