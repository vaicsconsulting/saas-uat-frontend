import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Download, Play, Plus, Upload } from 'lucide-react';
import { api } from '../api/client';
import type { RunBody, TemplateCaseBody } from '../api/types';
import { FileButton } from '../components/FileButton';
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageLoading, Progress } from '../components/ui';
import { cx, inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { fmtDate, importSummary, pct } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

export function ProjectPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const project = useAsync(() => api.getProject(id), [id]);
  const runs = useAsync(() => api.listRuns(id), [id]);
  const cases = useAsync(() => api.listTemplateCases(id), [id]);
  const [tab, setTab] = useState<'runs' | 'cases'>('runs');
  const [newRun, setNewRun] = useState(false);
  const [newCase, setNewCase] = useState(false);

  const modules = useMemo(() => {
    const m = new Map<string, number>();
    (cases.data ?? []).forEach((c) => m.set(c.module, (m.get(c.module) ?? 0) + 1));
    return [...m.entries()];
  }, [cases.data]);

  if (project.error) return <ErrorBox error={project.error} onRetry={project.reload} />;
  if (!project.data) return <PageLoading />;
  const p = project.data;

  return (
    <div>
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-navy">
          Projects
        </Link>{' '}
        / {p.name}
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {p.name} <span className="ml-1 align-middle text-sm font-bold text-navy-400">{p.key}</span>
          </h1>
          <p className="text-sm text-slate-500">
            {p.caseCount} cases in {modules.length} modules{p.clientName ? `. Client: ${p.clientName}` : ''}
          </p>
        </div>
        {can('ADMIN', 'TESTER') && (
          <Button onClick={() => setNewRun(true)} disabled={!p.caseCount}>
            <Play className="h-4 w-4" /> New run
          </Button>
        )}
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(['runs', 'cases'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('-mb-px border-b-2 px-4 py-2 text-sm font-medium', tab === t ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t === 'runs' ? `Runs (${p.runCount})` : `Test cases (${p.caseCount})`}
          </button>
        ))}
      </div>

      {tab === 'runs' &&
        (runs.error ? (
          <ErrorBox error={runs.error} onRetry={runs.reload} />
        ) : !runs.data ? (
          <PageLoading />
        ) : runs.data.length === 0 ? (
          <Empty title="No runs yet">{p.caseCount ? 'Start a run to test the current case list.' : 'Import or add test cases first.'}</Empty>
        ) : (
          <div className="space-y-3">
            {runs.data.map((r) => (
              <Link key={r.id} to={`/runs/${r.id}`} className="block">
                <Card className="flex items-center gap-6 p-4 hover:border-navy-300">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">{r.name}</h3>
                      {r.status === 'SIGNED_OFF' ? <Badge className="bg-green-50 text-pass">Signed off</Badge> : <Badge>In progress</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.environment}
                      {r.buildTag ? ` . ${r.buildTag}` : ''} . started {fmtDate(r.startedAt)}
                    </p>
                  </div>
                  <div className="w-48">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{pct(r.done, r.total)}% done</span>
                      <span>
                        {r.done}/{r.total}
                      </span>
                    </div>
                    <Progress value={pct(r.done, r.total)} />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </Card>
              </Link>
            ))}
          </div>
        ))}

      {tab === 'cases' && (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {can('ADMIN') && (
              <>
                <FileButton
                  accept=".xlsx"
                  label="Import Excel tracker"
                  icon={<Upload className="h-4 w-4" />}
                  onFile={async (f) => {
                    try {
                      const r = await api.importTemplate(id, f);
                      toast(r.warnings.length && !r.created && !r.updated ? 'error' : 'ok', r.warnings[0] && !r.created && !r.updated ? r.warnings[0] : importSummary(r));
                      cases.reload();
                      project.reload();
                    } catch (x) {
                      toast('error', errText(x));
                    }
                  }}
                />
                <Button size="sm" variant="secondary" onClick={() => setNewCase(true)}>
                  <Plus className="h-4 w-4" /> Add case
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => api.exportTemplate(id).catch((x) => toast('error', errText(x)))}>
              <Download className="h-4 w-4" /> Download as Excel
            </Button>
          </div>
          {!cases.data ? (
            <PageLoading />
          ) : cases.data.length === 0 ? (
            <Empty title="No test cases">Import the Excel tracker or add cases one by one.</Empty>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-navy text-left text-xs font-semibold text-white">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Module</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-navy">{c.caseKey}</td>
                      <td className="px-3 py-2 text-slate-600">{c.module}</td>
                      <td className="px-3 py-2 text-slate-900">{c.title}</td>
                      <td className="px-3 py-2">{c.priority}</td>
                      <td className="px-3 py-2 text-slate-600">{c.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      <NewRunModal open={newRun} onClose={() => setNewRun(false)} projectId={id} defaults={{ baseUrl: p.devBaseUrl, clientName: p.clientName }} />
      <NewCaseModal open={newCase} onClose={() => setNewCase(false)} projectId={id} nextKey={`${p.key}-${String((cases.data?.length ?? 0) + 1).padStart(3, '0')}`} onDone={() => { cases.reload(); project.reload(); }} />
    </div>
  );
}

function NewRunModal({ open, onClose, projectId, defaults }: { open: boolean; onClose: () => void; projectId: string; defaults: { baseUrl: string | null; clientName: string | null } }) {
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState<RunBody>({ name: '', environment: 'dev', buildTag: '', baseUrl: defaults.baseUrl ?? '', clientName: defaults.clientName ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof RunBody) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.createRun(projectId, { ...f, buildTag: f.buildTag || null, baseUrl: f.baseUrl || null, clientName: f.clientName || null });
      nav(`/runs/${r.id}`);
    } catch (x) {
      toast('error', errText(x));
      setBusy(false);
    }
  }
  return (
    <Modal open={open} title="New test run" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">The run takes a copy of the current case list. Later edits to cases do not change it.</p>
        <Field label="Run name">
          <input className={inputCls} required placeholder="UAT round 2" value={f.name} onChange={set('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Environment">
            <input className={inputCls} required value={f.environment} onChange={set('environment')} />
          </Field>
          <Field label="Build or version">
            <input className={inputCls} placeholder="fe 63ebd0a" value={f.buildTag ?? ''} onChange={set('buildTag')} />
          </Field>
        </div>
        <Field label="App URL for this run">
          <input className={inputCls} type="url" value={f.baseUrl ?? ''} onChange={set('baseUrl')} />
        </Field>
        <Field label="Client name" hint="Shown on the audit report">
          <input className={inputCls} value={f.clientName ?? ''} onChange={set('clientName')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy}>Start run</Button>
        </div>
      </form>
    </Modal>
  );
}

function NewCaseModal({ open, onClose, projectId, nextKey, onDone }: { open: boolean; onClose: () => void; projectId: string; nextKey: string; onDone: () => void }) {
  const toast = useToast();
  const empty: TemplateCaseBody = { caseKey: '', module: '', title: '', priority: 'P2', type: 'Functional', path: '', preconditions: '', steps: '', expected: '', testData: '' };
  const [f, setF] = useState<TemplateCaseBody>(empty);
  const set = (k: keyof TemplateCaseBody) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createTemplateCase(projectId, { ...f, caseKey: f.caseKey || nextKey });
      toast('ok', 'Case added');
      setF(empty);
      onClose();
      onDone();
    } catch (x) {
      toast('error', errText(x));
    }
  }
  return (
    <Modal open={open} title="Add test case" onClose={onClose} wide>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="ID">
          <input className={inputCls} placeholder={nextKey} value={f.caseKey} onChange={set('caseKey')} />
        </Field>
        <Field label="Module">
          <input className={inputCls} required value={f.module} onChange={set('module')} />
        </Field>
        <div className="col-span-2">
          <Field label="Title">
            <input className={inputCls} required value={f.title} onChange={set('title')} />
          </Field>
        </div>
        <Field label="Priority">
          <select className={inputCls} value={f.priority} onChange={set('priority')}>
            {['P1', 'P2', 'P3'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputCls} value={f.type} onChange={set('type')}>
            {['Functional', 'Security', 'UI', 'Negative', 'E2E'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Page path" hint="Added to the run URL, like /files">
          <input className={inputCls} value={f.path ?? ''} onChange={set('path')} />
        </Field>
        <Field label="Test data">
          <input className={inputCls} value={f.testData ?? ''} onChange={set('testData')} />
        </Field>
        <div className="col-span-2">
          <Field label="Preconditions">
            <textarea className={inputCls} rows={2} value={f.preconditions ?? ''} onChange={set('preconditions')} />
          </Field>
        </div>
        <Field label="Steps" hint="One per line">
          <textarea className={inputCls} rows={4} value={f.steps ?? ''} onChange={set('steps')} />
        </Field>
        <Field label="Expected result">
          <textarea className={inputCls} rows={4} value={f.expected ?? ''} onChange={set('expected')} />
        </Field>
        <div className="col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button>Add case</Button>
        </div>
      </form>
    </Modal>
  );
}
