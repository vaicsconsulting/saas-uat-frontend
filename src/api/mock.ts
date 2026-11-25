/* In-memory backend with sample V-Vault data. Used when VITE_MOCK=true. */
import type { Api } from './client';
import { saveBlob } from '../lib/download';
import type * as T from './types';
import { ApiError } from './types';
import sampleCases from './mock-cases.json';

const VV_URL = 'https://saas-v-drive-frontend-git-dev-vaics-consultings-projects.vercel.app';
const now = () => new Date().toISOString();
let seq = 0;
const id = (p: string) => `${p}_${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const wait = <X,>(x: X, ms = 120) => new Promise<X>((r) => setTimeout(() => r(structuredClone(x)), ms));
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function fakeShot(title: string, tone: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760">
<rect width="1280" height="760" fill="#F5F7FB"/><rect width="1280" height="64" fill="#1F3864"/>
<text x="32" y="40" font-family="Inter,Arial" font-size="22" font-weight="700" fill="#fff">V-Vault</text>
<rect x="0" y="64" width="240" height="696" fill="#fff"/><g fill="#D9E1EF">${[0, 1, 2, 3, 4]
    .map((i) => `<rect x="24" y="${100 + i * 48}" width="180" height="22" rx="6"/>`)
    .join('')}</g>
<text x="280" y="130" font-family="Inter,Arial" font-size="30" font-weight="700" fill="#101828">${title}</text>
<g fill="#fff" stroke="#E4E7EC">${[0, 1, 2].map((i) => `<rect x="${280 + i * 320}" y="170" width="296" height="140" rx="12"/>`).join('')}</g>
<rect x="280" y="340" width="936" height="360" rx="12" fill="#fff" stroke="#E4E7EC"/>
${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="310" y="${374 + i * 52}" width="${560 + ((i * 97) % 300)}" height="18" rx="6" fill="#EEF2F8"/>`).join('')}
<rect x="1060" y="96" width="156" height="44" rx="10" fill="${tone}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface DB {
  users: T.User[];
  me: T.User;
  projects: (Omit<T.Project, 'caseCount' | 'runCount' | 'openDefects' | 'lastRun'> & { defectSeq: number })[];
  templates: Record<string, T.TemplateCase[]>;
  runs: T.Run[];
  cases: T.RunCase[];
  events: (T.CaseEvent & { runCaseId: string })[];
  defects: T.Defect[];
  links: (T.ShareLink & { runId: string; token: string })[];
  signOffs: (T.AuditReport['signOffs'][number] & { runId: string })[];
  audit: (T.AuditEntry & { runId: string })[];
}

function seed(): DB {
  const u = (name: string, role: T.Role, email: string): T.User => ({ id: id('u'), name, role, email, active: true, createdAt: minutesAgo(9000) });
  const users = [u('Krishna', 'ADMIN', 'krishna@vaics.example'), u('Ravi Kumar', 'TESTER', 'ravi@vaics.example'), u('Meena S', 'TESTER', 'meena@vaics.example'), u('Arjun Dev', 'DEVELOPER', 'arjun@vaics.example'), u('Client Viewer', 'VIEWER', 'viewer@client.example')];
  const p = (key: string, name: string, description: string, devBaseUrl: string | null) => ({
    id: id('p'), key, name, description, devBaseUrl, clientName: key === 'VV' ? 'Plus Project Pvt Ltd' : null, clientLogoUrl: null, createdAt: minutesAgo(20000), defectSeq: 0,
  });
  const projects = [p('IMS', 'IMS', 'Inventory management app on the hub.', null), p('VV', 'V-Vault', 'Secure file vault and transfer (V-Drive).', VV_URL), p('VS', 'V-Sign', 'Document e-signing app on the hub.', null)];
  const vv = projects[1];
  const tpl: T.TemplateCase[] = (sampleCases as Omit<T.TemplateCase, 'id' | 'sortOrder'>[]).map((c, i) => ({ ...c, id: id('tc'), sortOrder: i }));
  const db: DB = { users, me: users[0], projects, templates: { [vv.id]: tpl, [projects[0].id]: [], [projects[2].id]: [] }, runs: [], cases: [], events: [], defects: [], links: [], signOffs: [], audit: [] };

  const run: T.Run = {
    id: 'run_demo', projectId: vv.id, projectKey: 'VV', projectName: 'V-Vault', name: 'UAT round 2', environment: 'dev', buildTag: 'fe 63ebd0a / be 3df7e22', baseUrl: VV_URL,
    clientName: vv.clientName, clientLogoUrl: null, status: 'ACTIVE', startedAt: minutesAgo(600), endedAt: null, lockedAt: null, reportId: 'UAT-VV-20261125-7QK2', reportHash: null, total: tpl.length, done: 0,
  };
  db.runs.push(run);
  db.cases = tpl.map((c, i) => ({
    id: `rc_${i}`, runId: run.id, caseKey: c.caseKey, module: c.module, title: c.title, role: c.role, path: c.path, priority: c.priority, type: c.type,
    preconditions: c.preconditions, steps: c.steps, expected: c.expected, testData: c.testData, sortOrder: i, status: 'NOT_RUN', actualResult: null, testedBy: null, testedAt: null,
    needsRetest: false, version: 0, openDefect: null, attachments: [],
  }));
  // Pre-filled results so the dashboard and report have something to show.
  const plan: [number, T.CaseStatus, string, string | null][] = [
    [0, 'PASS', 'Ravi Kumar', null], [1, 'PASS', 'Ravi Kumar', null], [2, 'PASS', 'Meena S', null], [3, 'FAIL', 'Meena S', 'Role badge shows Employee for a company admin.'],
    [4, 'PASS', 'Ravi Kumar', null], [5, 'BLOCKED', 'Ravi Kumar', 'Upload stuck at 99% on dev storage.'], [6, 'PASS', 'Meena S', null], [7, 'PASS', 'Meena S', null],
    [8, 'FAIL', 'Ravi Kumar', 'Guest door accepted an expired invite.'], [9, 'PASS', 'Ravi Kumar', null], [12, 'PASS', 'Meena S', null],
  ];
  plan.forEach(([i, st, who, note], k) => {
    const c = db.cases[i];
    const at = minutesAgo(500 - k * 35);
    c.status = st; c.actualResult = note; c.testedBy = who; c.testedAt = at; c.version = 1;
    if (k < 4) c.attachments = [{ id: id('a'), fileName: `${c.caseKey}.png`, mimeType: 'image/svg+xml', size: 48000, url: fakeShot(c.title.slice(0, 40), st === 'FAIL' ? '#B42318' : '#1E7B4D'), createdAt: at }];
    db.events.push({ id: id('e'), runCaseId: c.id, kind: 'result', status: st, note, actorName: who, data: null, attachments: c.attachments, createdAt: at });
    if (st === 'FAIL') {
      vv.defectSeq++;
      const code = `DEF-${String(vv.defectSeq).padStart(3, '0')}`;
      const d: T.Defect = {
        id: id('d'), code, runId: run.id, runCaseId: c.id, caseKey: c.caseKey, module: c.module, title: `${c.caseKey}: ${c.title}`, note, severity: c.priority, status: 'OPEN',
        reportedBy: who, assignee: null, fixRef: null, fixedBy: null, fixedAt: null, retestResult: null, retestedBy: null, retestedAt: null, version: 0, createdAt: at, attachments: c.attachments,
      };
      db.defects.push(d);
      c.openDefect = { id: d.id, code, status: 'OPEN' };
      db.events.push({ id: id('e'), runCaseId: c.id, kind: 'defect_opened', status: null, note: code, actorName: who, data: { defectCode: code }, attachments: [], createdAt: at });
    }
  });
  // One defect already fixed and waiting for retest.
  const d0 = db.defects[0];
  Object.assign(d0, { status: 'FIXED', fixRef: 'saas-v-drive-frontend PR #88', fixedBy: 'Arjun Dev', fixedAt: minutesAgo(90), assignee: { id: users[3].id, name: 'Arjun Dev' }, version: 2 });
  const c0 = db.cases.find((c) => c.id === d0.runCaseId)!;
  c0.needsRetest = true; c0.openDefect = { id: d0.id, code: d0.code, status: 'FIXED' }; c0.version = 2;
  db.events.push({ id: id('e'), runCaseId: c0.id, kind: 'fixed', status: null, note: null, actorName: 'Arjun Dev', data: { defectCode: d0.code, fixRef: d0.fixRef }, attachments: [], createdAt: minutesAgo(90) });
  db.defects[1].assignee = { id: users[3].id, name: 'Arjun Dev' };
  return db;
}

export function createMockApi(): Api {
  const db = seed();
  const listeners = new Map<string, Set<() => void>>();
  const emit = (runId: string) => listeners.get(runId)?.forEach((f) => setTimeout(f, 50));
  const log = (runId: string, action: string, data: unknown = null) => db.audit.push({ id: id('l'), runId, action, entity: action.split('.')[0], entityId: null, actorName: db.me.name, data, createdAt: now() });
  const runOf = (runId: string) => {
    const r = db.runs.find((x) => x.id === runId);
    if (!r) throw new ApiError(404, 'Run not found');
    const cs = db.cases.filter((c) => c.runId === runId);
    r.total = cs.length;
    r.done = cs.filter((c) => c.status !== 'NOT_RUN').length;
    return r;
  };
  const unlocked = (runId: string) => {
    const r = runOf(runId);
    if (r.lockedAt) throw new ApiError(423, 'This run is signed off and locked');
    return r;
  };
  const caseOf = (cid: string) => {
    const c = db.cases.find((x) => x.id === cid);
    if (!c) throw new ApiError(404, 'Case not found');
    return c;
  };
  const projectDto = (p: DB['projects'][number]): T.Project => {
    const runs = db.runs.filter((r) => r.projectId === p.id);
    const last = runs[runs.length - 1];
    return {
      id: p.id, key: p.key, name: p.name, description: p.description, devBaseUrl: p.devBaseUrl, clientName: p.clientName, clientLogoUrl: p.clientLogoUrl, createdAt: p.createdAt,
      caseCount: db.templates[p.id]?.length ?? 0, runCount: runs.length,
      openDefects: db.defects.filter((d) => runs.some((r) => r.id === d.runId) && ['OPEN', 'FIXED', 'RETEST_FAILED'].includes(d.status)).length,
      lastRun: last ? (() => { const r = runOf(last.id); return { id: r.id, name: r.name, status: r.status, done: r.done, total: r.total }; })() : null,
    };
  };
  const stats = (runId: string): T.RunStats => {
    const cs = db.cases.filter((c) => c.runId === runId);
    const z = () => ({ total: 0, pass: 0, fail: 0, blocked: 0, notRun: 0 });
    const tot = z();
    const mods = new Map<string, ReturnType<typeof z>>();
    const testers = new Map<string, { count: number; pass: number; fail: number; blocked: number }>();
    for (const c of cs) {
      const k = c.status === 'PASS' ? 'pass' : c.status === 'FAIL' ? 'fail' : c.status === 'BLOCKED' ? 'blocked' : 'notRun';
      if (!mods.has(c.module)) mods.set(c.module, z());
      mods.get(c.module)![k]++; mods.get(c.module)!.total++; tot[k]++; tot.total++;
      if (c.testedBy && k !== 'notRun') {
        const t = testers.get(c.testedBy) ?? { count: 0, pass: 0, fail: 0, blocked: 0 };
        t.count++; t[k]++; testers.set(c.testedBy, t);
      }
    }
    const ds = db.defects.filter((d) => d.runId === runId);
    const by: Record<string, number> = { OPEN: 0, FIXED: 0, RETEST_PASSED: 0, RETEST_FAILED: 0, CLOSED: 0 };
    ds.forEach((d) => by[d.status]++);
    const done = tot.total - tot.notRun;
    const recent = db.events
      .filter((e) => cs.some((c) => c.id === e.runCaseId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12)
      .map((e) => ({ caseKey: caseOf(e.runCaseId).caseKey, kind: e.kind, status: e.status, actorName: e.actorName, createdAt: e.createdAt }));
    return {
      runId, ...tot, done, percentDone: tot.total ? Math.round((done / tot.total) * 1000) / 10 : 0, passRate: done ? Math.round((tot.pass / done) * 1000) / 10 : null,
      needsRetest: cs.filter((c) => c.needsRetest).length, openDefects: by.OPEN + by.FIXED + by.RETEST_FAILED, defectsByStatus: by,
      modules: [...mods.entries()].map(([module, v]) => ({ module, ...v })), testers: [...testers.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count),
      recent, updatedAt: now(),
    };
  };
  const report = (runId: string): T.AuditReport => {
    const r = runOf(runId);
    const p = db.projects.find((x) => x.id === r.projectId)!;
    const cs = db.cases.filter((c) => c.runId === runId);
    const times = cs.map((c) => c.testedAt).filter(Boolean).sort() as string[];
    return {
      reportId: r.reportId ?? 'UAT-DRAFT', reportHash: r.reportHash, locked: Boolean(r.lockedAt), generatedAt: now(),
      brand: { company: 'VAICS Consulting', primary: '#1F3864' }, client: { name: r.clientName, logoUrl: r.clientLogoUrl }, project: { key: p.key, name: p.name },
      run: { name: r.name, environment: r.environment, buildTag: r.buildTag, baseUrl: r.baseUrl, windowStart: times[0] ?? r.startedAt, windowEnd: r.endedAt ?? times[times.length - 1] ?? null },
      stats: stats(runId),
      cases: cs.map((c) => ({
        caseKey: c.caseKey, module: c.module, title: c.title, priority: c.priority, type: c.type, expected: c.expected, status: c.status, actualResult: c.actualResult,
        testedBy: c.testedBy, testedAt: c.testedAt, defectCodes: db.defects.filter((d) => d.runCaseId === c.id).map((d) => d.code), screenshots: c.attachments,
      })),
      defects: db.defects.filter((d) => d.runId === runId),
      signOffs: db.signOffs.filter((s) => s.runId === runId),
      testers: [...new Set(cs.map((c) => c.testedBy).filter(Boolean) as string[])],
    };
  };
  const syncOpen = (c: T.RunCase) => {
    const d = db.defects.filter((x) => x.runCaseId === c.id && x.status !== 'CLOSED' && x.status !== 'RETEST_PASSED').pop();
    c.openDefect = d ? { id: d.id, code: d.code, status: d.status } : null;
  };

  const api: Api = {
    mock: true,
    login: async () => wait({ token: 'mock-token', user: db.me }),
    me: async () => wait(db.me, 20),
    getInvite: async () => wait({ email: 'new.tester@vaics.example', name: null, role: 'TESTER' as T.Role, expiresAt: new Date(Date.now() + 72 * 3600_000).toISOString() }),
    acceptInvite: async (_t, name) => wait({ token: 'mock-token', user: { ...db.me, name } }),
    async createInvite(body) {
      return wait({ id: id('i'), email: body.email, role: body.role, expiresAt: new Date(Date.now() + 72 * 3600_000).toISOString(), inviteUrl: `${location.origin}/invite/mock-${Math.random().toString(36).slice(2, 10)}` });
    },
    listUsers: async () => wait(db.users),
    async updateUser(uid, body) {
      const u = db.users.find((x) => x.id === uid)!;
      Object.assign(u, body);
      return wait(u);
    },
    listProjects: async () => wait(db.projects.map(projectDto)),
    async getProject(pid) {
      const p = db.projects.find((x) => x.id === pid);
      if (!p) throw new ApiError(404, 'Project not found');
      return wait(projectDto(p));
    },
    async createProject(body) {
      if (db.projects.some((p) => p.key === body.key)) throw new ApiError(409, 'That already exists');
      const p = { id: id('p'), key: body.key, name: body.name, description: body.description ?? null, devBaseUrl: body.devBaseUrl ?? null, clientName: body.clientName ?? null, clientLogoUrl: body.clientLogoUrl ?? null, createdAt: now(), defectSeq: 0 };
      db.projects.push(p);
      db.templates[p.id] = [];
      return wait(projectDto(p));
    },
    async updateProject(pid, body) {
      const p = db.projects.find((x) => x.id === pid)!;
      Object.assign(p, body);
      return wait(projectDto(p));
    },
    listTemplateCases: async (pid) => wait(db.templates[pid] ?? []),
    async createTemplateCase(pid, body) {
      const list = db.templates[pid];
      const c: T.TemplateCase = { id: id('tc'), sortOrder: list.length, role: null, path: null, preconditions: null, steps: null, expected: null, testData: null, ...body } as T.TemplateCase;
      list.push(c);
      return wait(c);
    },
    importTemplate: async () => wait({ created: 0, updated: 0, skipped: 0, warnings: ['Import needs the backend. This is mock mode'] }, 400),
    exportTemplate: async () => saveBlob(new Blob(['Mock mode has no Excel export'], { type: 'text/plain' }), 'template-mock.txt'),
    listRuns: async (pid) => wait(db.runs.filter((r) => r.projectId === pid).map((r) => runOf(r.id)).reverse()),
    async createRun(pid, body) {
      const p = db.projects.find((x) => x.id === pid)!;
      const tpl = db.templates[pid] ?? [];
      if (!tpl.length) throw new ApiError(400, 'Add or import test cases before starting a run');
      const r: T.Run = {
        id: id('run'), projectId: pid, projectKey: p.key, projectName: p.name, name: body.name, environment: body.environment ?? 'dev', buildTag: body.buildTag ?? null, baseUrl: body.baseUrl ?? p.devBaseUrl,
        clientName: body.clientName ?? p.clientName, clientLogoUrl: body.clientLogoUrl ?? p.clientLogoUrl, status: 'ACTIVE', startedAt: now(), endedAt: null, lockedAt: null,
        reportId: `UAT-${p.key}-${now().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, reportHash: null, total: tpl.length, done: 0,
      };
      db.runs.push(r);
      tpl.forEach((c, i) => db.cases.push({ ...c, id: id('rc'), runId: r.id, sortOrder: i, status: 'NOT_RUN', actualResult: null, testedBy: null, testedAt: null, needsRetest: false, version: 0, openDefect: null, attachments: [] }));
      log(r.id, 'run.created', { name: r.name });
      return wait(runOf(r.id));
    },
    getRun: async (rid) => wait(runOf(rid), 60),
    listRunCases: async (rid) => wait(db.cases.filter((c) => c.runId === rid), 80),
    getRunStats: async (rid) => wait(stats(rid), 60),
    listRunDefects: async (rid) => wait(db.defects.filter((d) => d.runId === rid)),
    getCaseHistory: async (cid) => wait(db.events.filter((e) => e.runCaseId === cid).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), 60),
    async recordResult(cid, body) {
      const c = caseOf(cid);
      const r = unlocked(c.runId);
      if (c.version !== body.version) throw new ApiError(409, 'Someone else updated this case. Check the latest result and try again');
      const fixed = db.defects.find((d) => d.runCaseId === c.id && d.status === 'FIXED');
      const retest = Boolean(c.needsRetest || fixed);
      const at = now();
      const atts = c.attachments.filter((a) => (body.attachmentIds ?? []).includes(a.id));
      Object.assign(c, { status: body.status, actualResult: body.actualResult ?? null, testedBy: db.me.name, testedAt: at, needsRetest: false, version: c.version + 1 });
      db.events.push({ id: id('e'), runCaseId: c.id, kind: retest ? 'retest' : 'result', status: body.status, note: body.actualResult ?? null, actorName: db.me.name, data: fixed ? { defectCode: fixed.code } : null, attachments: atts, createdAt: at });
      let defect: T.Defect | null = null;
      if (fixed) {
        Object.assign(fixed, { status: body.status === 'PASS' ? 'RETEST_PASSED' : 'RETEST_FAILED', retestResult: body.status, retestedBy: db.me.name, retestedAt: at, version: fixed.version + 1 });
        defect = fixed;
      } else if (body.status === 'FAIL') {
        const ex = db.defects.find((d) => d.runCaseId === c.id && ['OPEN', 'RETEST_FAILED'].includes(d.status));
        if (ex) defect = ex;
        else {
          const p = db.projects.find((x) => x.id === r.projectId)!;
          p.defectSeq++;
          const code = `DEF-${String(p.defectSeq).padStart(3, '0')}`;
          defect = { id: id('d'), code, runId: r.id, runCaseId: c.id, caseKey: c.caseKey, module: c.module, title: `${c.caseKey}: ${c.title}`, note: body.actualResult ?? null, severity: c.priority, status: 'OPEN', reportedBy: db.me.name, assignee: null, fixRef: null, fixedBy: null, fixedAt: null, retestResult: null, retestedBy: null, retestedAt: null, version: 0, createdAt: at, attachments: atts };
          db.defects.push(defect);
          db.events.push({ id: id('e'), runCaseId: c.id, kind: 'defect_opened', status: null, note: code, actorName: db.me.name, data: { defectCode: code }, attachments: [], createdAt: at });
          log(r.id, 'defect.opened', { code });
        }
      }
      syncOpen(c);
      log(r.id, retest ? 'case.retested' : 'case.result', { caseKey: c.caseKey, to: body.status });
      emit(r.id);
      return wait({ case: c, defect, retest }, 150);
    },
    async uploadScreenshot(cid, file, fileName) {
      const c = caseOf(cid);
      unlocked(c.runId);
      const url = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file); });
      const a: T.Attachment = { id: id('a'), fileName, mimeType: file.type, size: file.size, url, createdAt: now() };
      c.attachments.push(a);
      return wait(a, 200);
    },
    async updateDefect(did, body) {
      const d = db.defects.find((x) => x.id === did)!;
      unlocked(d.runId);
      if (d.version !== body.version) throw new ApiError(409, 'Someone else updated this defect. Reload and try again');
      if (body.assigneeId !== undefined) { const u = db.users.find((x) => x.id === body.assigneeId); d.assignee = u ? { id: u.id, name: u.name } : null; }
      if (body.status) d.status = body.status;
      if (body.note !== undefined) d.note = body.note ?? null;
      if (body.severity) d.severity = body.severity;
      d.version++;
      const c = caseOf(d.runCaseId);
      if (body.status === 'CLOSED') c.needsRetest = false;
      syncOpen(c);
      log(d.runId, 'defect.updated', { code: d.code });
      emit(d.runId);
      return wait(d);
    },
    async fixDefect(did, body) {
      const d = db.defects.find((x) => x.id === did)!;
      unlocked(d.runId);
      if (d.version !== body.version) throw new ApiError(409, 'Someone else updated this defect. Reload and try again');
      Object.assign(d, { status: 'FIXED', fixRef: body.fixRef, fixedBy: db.me.name, fixedAt: now(), retestResult: null, retestedBy: null, retestedAt: null, version: d.version + 1 });
      const c = caseOf(d.runCaseId);
      c.needsRetest = true; c.version++;
      syncOpen(c);
      db.events.push({ id: id('e'), runCaseId: c.id, kind: 'fixed', status: null, note: body.note ?? null, actorName: db.me.name, data: { defectCode: d.code, fixRef: body.fixRef }, attachments: [], createdAt: now() });
      log(d.runId, 'defect.fixed', { code: d.code, fixRef: body.fixRef });
      emit(d.runId);
      return wait(d);
    },
    importResults: async () => wait({ created: 0, updated: 0, skipped: 0, warnings: ['Import needs the backend. This is mock mode'] }, 400),
    importDocx: async () => wait({ created: 0, updated: 0, skipped: 0, warnings: ['Import needs the backend. This is mock mode'] }, 400),
    exportRun: async () => saveBlob(new Blob(['Mock mode has no Excel export'], { type: 'text/plain' }), 'tracker-mock.txt'),
    getReport: async (rid) => wait(report(rid)),
    downloadReportPdf: async () => window.print(),
    getAuditLog: async (rid) => wait(db.audit.filter((a) => a.runId === rid)),
    async signOff(rid, body) {
      const r = unlocked(rid);
      const notRun = db.cases.filter((c) => c.runId === rid && c.status === 'NOT_RUN').length;
      if (notRun) throw new ApiError(400, `${notRun} case(s) are not run yet. Mark them Blocked or run them first`);
      const at = now();
      body.signers.forEach((s) => db.signOffs.push({ id: id('s'), runId: rid, name: s.name, role: s.role, company: s.company ?? null, signedAt: at }));
      Object.assign(r, { status: 'SIGNED_OFF', lockedAt: at, endedAt: at, reportHash: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('') });
      log(rid, 'run.signed_off');
      emit(rid);
      return wait(r);
    },
    listShareLinks: async (rid) => wait(db.links.filter((l) => l.runId === rid)),
    async createShareLink(rid, body) {
      const token = `mock${Math.random().toString(36).slice(2, 12)}`;
      const l = { id: id('sl'), runId: rid, token, label: body.label, tokenHint: token.slice(-4), expiresAt: new Date(Date.now() + (body.expiresInDays ?? 14) * 86400_000).toISOString(), revokedAt: null, lastUsedAt: null, createdAt: now() };
      db.links.unshift(l);
      return wait({ ...l, url: `${location.origin}/audit/${token}` });
    },
    async revokeShareLink(lid) {
      const l = db.links.find((x) => x.id === lid);
      if (l) l.revokedAt = now();
    },
    async publicReport(token) {
      const l = db.links.find((x) => x.token === token && !x.revokedAt);
      const rid = l?.runId ?? (token === 'demo' ? 'run_demo' : null);
      if (!rid) throw new ApiError(404, 'This link is not valid or has expired');
      return wait({ ...report(rid), shareExpiresAt: l?.expiresAt ?? new Date(Date.now() + 14 * 86400_000).toISOString() });
    },
    downloadPublicPdf: async () => window.print(),
    subscribeRun(rid, onChange) {
      if (!listeners.has(rid)) listeners.set(rid, new Set());
      listeners.get(rid)!.add(onChange);
      return () => listeners.get(rid)!.delete(onChange);
    },
  };
  return api;
}
