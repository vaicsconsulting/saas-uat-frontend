import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import type { ProjectBody } from '../api/types';
import { Button, Card, Empty, ErrorBox, Field, Modal, PageLoading, Progress } from '../components/ui';
import { inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { pct } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

export function ProjectsPage() {
  const { can } = useAuth();
  const q = useAsync(() => api.listProjects(), []);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">One project per app. Pick one to see its runs.</p>
        </div>
        {can('ADMIN') && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        )}
      </div>
      {q.error ? (
        <ErrorBox error={q.error} onRetry={q.reload} />
      ) : !q.data ? (
        <PageLoading />
      ) : q.data.length === 0 ? (
        <Empty title="No projects yet">An admin can add the first one.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:border-navy-300 group-hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy">{p.key}</span>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">{p.name}</h2>
                  </div>
                  {p.openDefects > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-fail">{p.openDefects} open defects</span>}
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                <div className="mt-4 flex gap-4 text-sm text-slate-600">
                  <span>
                    <b className="text-slate-900">{p.caseCount}</b> cases
                  </span>
                  <span>
                    <b className="text-slate-900">{p.runCount}</b> runs
                  </span>
                </div>
                {p.lastRun ? (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span className="truncate">{p.lastRun.name}</span>
                      <span>
                        {p.lastRun.done}/{p.lastRun.total}
                      </span>
                    </div>
                    <Progress value={pct(p.lastRun.done, p.lastRun.total)} />
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">No runs yet</p>
                )}
                {p.devBaseUrl && (
                  <p className="mt-3 flex items-center gap-1 truncate text-xs text-slate-400">
                    <ExternalLink className="h-3 w-3" /> {p.devBaseUrl.replace(/^https?:\/\//, '')}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
      <NewProject open={open} onClose={() => setOpen(false)} onDone={q.reload} />
    </div>
  );
}

function NewProject({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<ProjectBody>({ key: '', name: '', description: '', devBaseUrl: '', clientName: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ProjectBody) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createProject({ ...f, key: f.key.toUpperCase(), description: f.description || null, devBaseUrl: f.devBaseUrl || null, clientName: f.clientName || null });
      toast('ok', 'Project added');
      onClose();
      onDone();
    } catch (x) {
      toast('error', errText(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} title="New project" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Key" hint="Like VV">
            <input className={inputCls} required maxLength={8} value={f.key} onChange={set('key')} />
          </Field>
          <div className="col-span-2">
            <Field label="App name">
              <input className={inputCls} required value={f.name} onChange={set('name')} />
            </Field>
          </div>
        </div>
        <Field label="Dev app URL" hint="Used by the Open in app button">
          <input className={inputCls} type="url" placeholder="https://" value={f.devBaseUrl ?? ''} onChange={set('devBaseUrl')} />
        </Field>
        <Field label="Client name" hint="Shown on the audit report">
          <input className={inputCls} value={f.clientName ?? ''} onChange={set('clientName')} />
        </Field>
        <Field label="Short description">
          <input className={inputCls} value={f.description ?? ''} onChange={set('description')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy}>Add project</Button>
        </div>
      </form>
    </Modal>
  );
}
