import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Loader2, OctagonX, RotateCcw, Search, ShieldAlert, X } from 'lucide-react';
import { api } from '../api/client';
import type { Attachment, CaseStatus, RunCase } from '../api/types';
import { ApiError } from '../api/types';
import { HistoryTimeline } from '../components/History';
import { Badge, Button, ErrorBox, Kbd, PageLoading, Progress, StatusPill } from '../components/ui';
import { STATUS_DOT, cx } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { fmtDateTime, joinUrl, pct } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';
import { useRunLive } from '../lib/useRun';

type Filter = 'all' | 'todo' | 'retest' | 'fail';
interface Pending {
  key: string;
  preview: string;
  status: 'uploading' | 'done' | 'error';
  attachment?: Attachment;
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
const needsWork = (c: RunCase) => c.status === 'NOT_RUN' || c.needsRetest;

function steps(text: string | null) {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

export function FocusView() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const run = useAsync(() => api.getRun(id), [id]);
  const cases = useAsync(() => api.listRunCases(id), [id]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<CaseStatus | null>(null);
  const [dragging, setDragging] = useState(false);
  const [needNote, setNeedNote] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => cases.data ?? [], [cases.data]);
  const currentId = params.get('case');
  const current = useMemo(() => list.find((c) => c.id === currentId) ?? list.find(needsWork) ?? list[0] ?? null, [list, currentId]);
  const idx = current ? list.findIndex((c) => c.id === current.id) : -1;
  const history = useAsync(() => (current ? api.getCaseHistory(current.id) : Promise.resolve([])), [current?.id, current?.version]);
  const locked = Boolean(run.data?.lockedAt);
  const canTest = can('ADMIN', 'TESTER') && !locked;

  const live = useCallback(() => {
    void cases.reload();
    void run.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useRunLive(id, live);

  const go = useCallback(
    (c: RunCase | undefined | null) => {
      if (!c) return;
      setParams({ case: c.id }, { replace: true });
    },
    [setParams],
  );

  // Reset the form when the case changes.
  useEffect(() => {
    setNote('');
    setNeedNote(false);
    setPending((p) => {
      p.forEach((x) => URL.revokeObjectURL(x.preview));
      return [];
    });
    listRef.current?.querySelector(`[data-case="${current?.id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current?.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (filter === 'todo' && c.status !== 'NOT_RUN') return false;
      if (filter === 'retest' && !c.needsRetest) return false;
      if (filter === 'fail' && c.status !== 'FAIL') return false;
      return !q || c.caseKey.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.module.toLowerCase().includes(q);
    });
  }, [list, filter, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, RunCase[]>();
    visible.forEach((c) => m.set(c.module, [...(m.get(c.module) ?? []), c]));
    return [...m.entries()];
  }, [visible]);

  const nextOpen = useCallback(
    (after: number, data: RunCase[]) => {
      for (let i = 1; i <= data.length; i++) {
        const c = data[(after + i) % data.length];
        if (needsWork(c)) return c;
      }
      return null;
    },
    [],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (!current || !canTest) return;
      const imgs = files.filter((f) => /^image\/(png|jpeg|gif|webp)$/.test(f.type));
      if (!imgs.length) {
        if (files.length) toast('error', 'Only images (png, jpg, gif, webp)');
        return;
      }
      const caseId = current.id;
      imgs.forEach((f, i) => {
        const key = `${Date.now()}-${i}-${Math.random()}`;
        const name = f.name && f.name !== 'image.png' ? f.name : `${current.caseKey}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`;
        setPending((p) => [...p, { key, preview: URL.createObjectURL(f), status: 'uploading' }]);
        api
          .uploadScreenshot(caseId, f, name)
          .then((a) => setPending((p) => p.map((x) => (x.key === key ? { ...x, status: 'done', attachment: a } : x))))
          .catch((e) => {
            setPending((p) => p.map((x) => (x.key === key ? { ...x, status: 'error' } : x)));
            toast('error', errText(e));
          });
      });
    },
    [current, canTest, toast],
  );

  const submit = useCallback(
    async (status: Exclude<CaseStatus, 'NOT_RUN'>) => {
      if (!current || !canTest || busy) return;
      if (pending.some((p) => p.status === 'uploading')) return toast('error', 'Wait for screenshots to finish uploading');
      if (status !== 'PASS' && !note.trim()) {
        setNeedNote(true);
        noteRef.current?.focus();
        return;
      }
      setBusy(status);
      try {
        const out = await api.recordResult(current.id, {
          status,
          actualResult: note.trim() || null,
          version: current.version,
          attachmentIds: pending.filter((p) => p.attachment).map((p) => p.attachment!.id),
        });
        const updated = list.map((c) => (c.id === out.case.id ? out.case : c));
        cases.setData(updated);
        if (out.defect && status === 'FAIL' && !out.retest) toast('ok', `${current.caseKey} failed. ${out.defect.code} opened`);
        else if (out.retest) toast('ok', `Retest saved for ${current.caseKey}`);
        const nxt = nextOpen(idx, updated);
        if (nxt) go(nxt);
        else toast('ok', 'All cases in this run have a result');
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          toast('error', e.message);
          void cases.reload();
        } else toast('error', errText(e));
      } finally {
        setBusy(null);
      }
    },
    [current, canTest, busy, pending, note, list, idx, nextOpen, go, cases, toast],
  );

  // Keyboard shortcuts and paste.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'p') submit('PASS');
      else if (k === 'f') submit('FAIL');
      else if (k === 'b') submit('BLOCKED');
      else if (k === 'n' || k === 'j') go(list[idx + 1]);
      else if (k === 'k') go(list[idx - 1]);
      else if (k === '/') {
        e.preventDefault();
        noteRef.current?.focus();
      } else return;
    };
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [submit, go, list, idx, addFiles]);

  if (run.error || cases.error) return <div className="p-6"><ErrorBox error={run.error ?? cases.error} onRetry={() => { run.reload(); cases.reload(); }} /></div>;
  if (!run.data || !cases.data) return <PageLoading />;
  const r = run.data;
  const done = list.filter((c) => c.status !== 'NOT_RUN').length;
  const openUrl = current ? joinUrl(r.baseUrl, current.path) : null;

  return (
    <div
      className="flex h-screen flex-col bg-slate-50"
      onDragOver={(e) => {
        if (canTest && e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles([...e.dataTransfer.files]);
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-4 bg-navy px-4 text-white">
        <Link to={`/runs/${id}`} className="flex items-center gap-1 rounded px-2 py-1 text-sm text-white/80 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {r.projectName} . {r.name}
          </p>
          <p className="text-xs text-white/60">
            {r.environment}
            {r.buildTag ? ` . ${r.buildTag}` : ''}
          </p>
        </div>
        <div className="ml-auto flex w-64 items-center gap-3">
          <Progress value={pct(done, list.length)} className="bg-white/20" color="bg-white" />
          <span className="shrink-0 text-xs text-white/80">
            {done}/{list.length}
          </span>
        </div>
      </header>
      {locked && <div className="bg-green-50 px-4 py-2 text-center text-sm text-green-900">This run is signed off. Read only.</div>}

      <div className="flex min-h-0 flex-1">
        {/* Case list */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="space-y-2 border-b border-slate-200 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a case" className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-navy-500 focus:outline-none" />
            </div>
            <div className="flex gap-1">
              {(
                [
                  ['all', 'All'],
                  ['todo', 'To do'],
                  ['retest', 'Retest'],
                  ['fail', 'Failed'],
                ] as [Filter, string][]
              ).map(([f, l]) => (
                <button key={f} onClick={() => setFilter(f)} className={cx('rounded-md px-2.5 py-1 text-xs font-medium', filter === f ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto py-2">
            {grouped.map(([module, cs]) => (
              <div key={module} className="mb-2">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{module}</p>
                {cs.map((c) => (
                  <button
                    key={c.id}
                    data-case={c.id}
                    onClick={() => go(c)}
                    className={cx('flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm', c.id === current?.id ? 'bg-navy-50 text-navy' : 'text-slate-700 hover:bg-slate-50')}
                  >
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', c.needsRetest ? 'bg-retest' : STATUS_DOT[c.status])} />
                    <span className="w-14 shrink-0 font-mono text-xs font-semibold">{c.caseKey}</span>
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
            ))}
            {grouped.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No cases match.</p>}
          </div>
        </aside>

        {/* Case */}
        {current ? (
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-navy px-2 py-0.5 font-mono text-sm font-bold text-white">{current.caseKey}</span>
                <Badge>{current.module}</Badge>
                <Badge className={current.priority === 'P1' ? 'bg-red-50 text-fail' : ''}>{current.priority}</Badge>
                <Badge>{current.type}</Badge>
                {current.role && <Badge>{current.role}</Badge>}
                <span className="ml-auto text-xs text-slate-400">
                  {idx + 1} of {list.length}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold leading-snug text-slate-900">{current.title}</h1>

              {current.needsRetest && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {current.openDefect?.code} is marked fixed. Please retest this case and record the result.
                  </span>
                </div>
              )}
              {current.status !== 'NOT_RUN' && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                  <span className="text-slate-500">Last result</span>
                  <StatusPill status={current.status} />
                  <span className="text-slate-600">
                    by {current.testedBy} . {fmtDateTime(current.testedAt)}
                  </span>
                  {current.openDefect && !current.needsRetest && <span className="font-mono text-xs font-semibold text-fail">{current.openDefect.code}</span>}
                  {current.actualResult && <p className="w-full text-slate-700">{current.actualResult}</p>}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {openUrl ? (
                  <a href={openUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">
                      <ExternalLink className="h-4 w-4" /> Open in app
                    </Button>
                  </a>
                ) : (
                  <Button variant="secondary" disabled title="Set the app URL on the run">
                    <ExternalLink className="h-4 w-4" /> Open in app
                  </Button>
                )}
                {current.path && <span className="self-center font-mono text-xs text-slate-500">{current.path}</span>}
              </div>

              <section className="mt-6 space-y-5">
                {current.preconditions && (
                  <div>
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Before you start</h2>
                    <p className="whitespace-pre-line text-[15px] text-slate-800">{current.preconditions}</p>
                  </div>
                )}
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Steps</h2>
                  <ol className="space-y-2">
                    {steps(current.steps).map((s, i) => (
                      <li key={i} className="flex gap-3 text-[15px] text-slate-800">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy">{i + 1}</span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                    {!current.steps && <li className="text-sm text-slate-500">No steps written.</li>}
                  </ol>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                  <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-pass">Expected result</h2>
                  <p className="whitespace-pre-line text-[15px] text-slate-800">{current.expected || 'Not written.'}</p>
                </div>
                {current.testData && (
                  <div>
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Test data</h2>
                    <p className="whitespace-pre-line rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">{current.testData}</p>
                  </div>
                )}
              </section>

              <div className="mt-8 flex justify-between border-t border-slate-200 pt-4">
                <Button variant="ghost" disabled={idx <= 0} onClick={() => go(list[idx - 1])}>
                  <ChevronLeft className="h-4 w-4" /> Previous <Kbd>K</Kbd>
                </Button>
                <Button variant="ghost" disabled={idx >= list.length - 1} onClick={() => go(list[idx + 1])}>
                  <Kbd>N</Kbd> Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex flex-1 items-center justify-center text-slate-500">No cases in this run.</main>
        )}

        {/* Result panel */}
        {current && (
          <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
            <div className="space-y-4 p-5">
              <h2 className="font-semibold text-slate-900">{current.needsRetest ? 'Retest result' : 'Your result'}</h2>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="pass" size="lg" disabled={!canTest || !!busy} onClick={() => submit('PASS')} className="flex-col gap-0 py-8">
                  {busy === 'PASS' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  <span>Pass</span>
                  <span className="text-[10px] opacity-80">P</span>
                </Button>
                <Button variant="fail" size="lg" disabled={!canTest || !!busy} onClick={() => submit('FAIL')} className="flex-col gap-0 py-8">
                  {busy === 'FAIL' ? <Loader2 className="h-5 w-5 animate-spin" /> : <OctagonX className="h-5 w-5" />}
                  <span>Fail</span>
                  <span className="text-[10px] opacity-80">F</span>
                </Button>
                <Button variant="blocked" size="lg" disabled={!canTest || !!busy} onClick={() => submit('BLOCKED')} className="flex-col gap-0 py-8">
                  {busy === 'BLOCKED' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
                  <span>Blocked</span>
                  <span className="text-[10px] opacity-80">B</span>
                </Button>
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                  What happened <Kbd>/</Kbd>
                </label>
                <input
                  ref={noteRef}
                  value={note}
                  disabled={!canTest}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNeedNote(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && note.trim()) {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  maxLength={2000}
                  placeholder="One line. Needed for Fail and Blocked"
                  className={cx('block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-4', needNote ? 'border-fail focus:ring-red-100' : 'border-slate-300 focus:border-navy-500 focus:ring-navy-100')}
                />
                {needNote && <p className="mt-1 text-xs text-fail">Add a short note first.</p>}
              </div>

              <div
                className={cx(
                  'rounded-lg border-2 border-dashed p-4 text-center text-sm transition',
                  dragging ? 'border-navy bg-navy-50 text-navy' : 'border-slate-300 text-slate-500',
                )}
              >
                <ImagePlus className="mx-auto mb-1 h-6 w-6" />
                <p>
                  Paste a screenshot with <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd>
                </p>
                <p className="text-xs">or drop images here</p>
              </div>

              {(pending.length > 0 || current.attachments.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {pending.map((p) => (
                    <div key={p.key} className="relative overflow-hidden rounded-md border border-slate-200">
                      <img src={p.preview} alt="" className="h-20 w-full object-cover" />
                      {p.status === 'uploading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <Loader2 className="h-5 w-5 animate-spin text-navy" />
                        </div>
                      )}
                      {p.status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 text-xs font-semibold text-fail">Failed</div>}
                      <button
                        className="absolute right-1 top-1 rounded bg-white/90 p-0.5 text-slate-600 hover:text-fail"
                        title="Do not attach"
                        onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-navy/80 px-1 text-[10px] text-white">New</span>
                    </div>
                  ))}
                  {current.attachments.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md border border-slate-200">
                      <img src={a.url} alt={a.fileName} className="h-20 w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <p className="mb-1 font-medium text-slate-600">Shortcuts</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  <span><Kbd>P</Kbd> pass</span>
                  <span><Kbd>F</Kbd> fail</span>
                  <span><Kbd>B</Kbd> blocked</span>
                  <span><Kbd>N</Kbd>/<Kbd>J</Kbd> next</span>
                  <span><Kbd>K</Kbd> previous</span>
                  <span><Kbd>/</Kbd> note</span>
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">History</h2>
                <Link to={`/runs/${id}/cases/${current.id}/history`} className="text-xs font-medium text-navy hover:underline">
                  Full view
                </Link>
              </div>
              <HistoryTimeline events={history.data ?? []} compact />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
