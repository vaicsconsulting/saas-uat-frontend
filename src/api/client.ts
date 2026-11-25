import type * as T from './types';
import { ApiError } from './types';
import { createMockApi } from './mock';
import { saveBlob } from '../lib/download';

export { saveBlob };

/** Everything the UI needs from the backend. The mock and HTTP versions share this. */
export interface Api {
  readonly mock: boolean;
  login(email: string, password: string): Promise<T.AuthResult>;
  me(): Promise<T.User>;
  getInvite(token: string): Promise<T.InviteInfo>;
  acceptInvite(token: string, name: string, password: string): Promise<T.AuthResult>;
  createInvite(body: { email: string; name?: string; role: T.Role }): Promise<T.InviteResult>;
  listUsers(): Promise<T.User[]>;
  updateUser(id: string, body: { role?: T.Role; active?: boolean }): Promise<T.User>;

  listProjects(): Promise<T.Project[]>;
  getProject(id: string): Promise<T.Project>;
  createProject(body: T.ProjectBody): Promise<T.Project>;
  updateProject(id: string, body: Partial<T.ProjectBody>): Promise<T.Project>;
  listTemplateCases(projectId: string): Promise<T.TemplateCase[]>;
  createTemplateCase(projectId: string, body: T.TemplateCaseBody): Promise<T.TemplateCase>;
  importTemplate(projectId: string, file: File): Promise<T.ImportResult>;
  exportTemplate(projectId: string): Promise<void>;
  listRuns(projectId: string): Promise<T.Run[]>;
  createRun(projectId: string, body: T.RunBody): Promise<T.Run>;

  getRun(id: string): Promise<T.Run>;
  listRunCases(runId: string): Promise<T.RunCase[]>;
  getRunStats(runId: string): Promise<T.RunStats>;
  listRunDefects(runId: string): Promise<T.Defect[]>;
  getCaseHistory(caseId: string): Promise<T.CaseEvent[]>;
  recordResult(caseId: string, body: T.ResultBody): Promise<T.ResultOutcome>;
  uploadScreenshot(caseId: string, file: Blob, fileName: string): Promise<T.Attachment>;
  updateDefect(id: string, body: T.DefectPatch): Promise<T.Defect>;
  fixDefect(id: string, body: T.FixBody): Promise<T.Defect>;
  importResults(runId: string, file: File): Promise<T.ImportResult>;
  importDocx(runId: string, file: File): Promise<T.ImportResult>;
  exportRun(runId: string): Promise<void>;
  getReport(runId: string): Promise<T.AuditReport>;
  downloadReportPdf(runId: string): Promise<void>;
  getAuditLog(runId: string): Promise<T.AuditEntry[]>;
  signOff(runId: string, body: T.SignOffBody): Promise<T.Run>;
  listShareLinks(runId: string): Promise<T.ShareLink[]>;
  createShareLink(runId: string, body: T.ShareLinkBody): Promise<T.ShareLink>;
  revokeShareLink(id: string): Promise<void>;
  publicReport(token: string): Promise<T.PublicReport>;
  downloadPublicPdf(token: string): Promise<void>;
  /** Live updates. Returns an unsubscribe function. */
  subscribeRun(runId: string, onChange: () => void): () => void;
}

const TOKEN_KEY = 'uat.token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

function fileNameFrom(res: Response, fallback: string) {
  const cd = res.headers.get('Content-Disposition') ?? '';
  const m = cd.match(/filename="?([^"]+)"?/);
  return m ? m[1] : fallback;
}

export function createHttpApi(base: string): Api {
  const root = base.replace(/\/$/, '');

  async function call<R>(method: string, path: string, body?: unknown, opts: { auth?: boolean; form?: FormData } = {}): Promise<R> {
    const headers: Record<string, string> = {};
    const token = tokenStore.get();
    if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
    let payload: BodyInit | undefined;
    if (opts.form) payload = opts.form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    let res: Response;
    try {
      res = await fetch(`${root}${path}`, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, 'Cannot reach the server. Check your connection');
    }
    if (res.status === 204) return undefined as R;
    const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
    if (!res.ok) {
      if (res.status === 401 && opts.auth !== false && path !== '/auth/login') {
        tokenStore.set(null);
        window.dispatchEvent(new Event('uat:signed-out'));
      }
      throw new ApiError(res.status, data?.error?.message ?? `Request failed (${res.status})`, data?.error?.code, data?.error?.details);
    }
    return data as R;
  }

  async function download(path: string, fallback: string, auth = true) {
    const headers: Record<string, string> = {};
    const token = tokenStore.get();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${root}${path}`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(res.status, data?.error?.message ?? 'Download failed');
    }
    saveBlob(await res.blob(), fileNameFrom(res, fallback));
  }

  const form = (file: File) => {
    const f = new FormData();
    f.append('file', file);
    return f;
  };

  return {
    mock: false,
    login: (email, password) => call('POST', '/auth/login', { email, password }, { auth: false }),
    me: () => call('GET', '/auth/me'),
    getInvite: (token) => call('GET', `/auth/invites/${encodeURIComponent(token)}`, undefined, { auth: false }),
    acceptInvite: (token, name, password) => call('POST', '/auth/accept-invite', { token, name, password }, { auth: false }),
    createInvite: (body) => call('POST', '/auth/invites', body),
    listUsers: () => call('GET', '/users'),
    updateUser: (id, body) => call('PATCH', `/users/${id}`, body),

    listProjects: () => call('GET', '/projects'),
    getProject: (id) => call('GET', `/projects/${id}`),
    createProject: (body) => call('POST', '/projects', body),
    updateProject: (id, body) => call('PATCH', `/projects/${id}`, body),
    listTemplateCases: (id) => call('GET', `/projects/${id}/cases`),
    createTemplateCase: (id, body) => call('POST', `/projects/${id}/cases`, body),
    importTemplate: (id, file) => call('POST', `/projects/${id}/import`, undefined, { form: form(file) }),
    exportTemplate: (id) => download(`/projects/${id}/export`, 'template.xlsx'),
    listRuns: (id) => call('GET', `/projects/${id}/runs`),
    createRun: (id, body) => call('POST', `/projects/${id}/runs`, body),

    getRun: (id) => call('GET', `/runs/${id}`),
    listRunCases: (id) => call('GET', `/runs/${id}/cases`),
    getRunStats: (id) => call('GET', `/runs/${id}/stats`),
    listRunDefects: (id) => call('GET', `/runs/${id}/defects`),
    getCaseHistory: (id) => call('GET', `/cases/${id}/history`),
    recordResult: (id, body) => call('POST', `/cases/${id}/result`, body),
    async uploadScreenshot(caseId, file, fileName) {
      const pre = await call<T.PresignResult>('POST', `/cases/${caseId}/attachments`, { fileName, mimeType: file.type, size: file.size });
      const up = await fetch(pre.upload.url, { method: 'PUT', headers: pre.upload.headers, body: file });
      if (!up.ok) throw new ApiError(up.status, 'Upload failed. Try again');
      return call('POST', `/attachments/${pre.attachmentId}/confirm`);
    },
    updateDefect: (id, body) => call('PATCH', `/defects/${id}`, body),
    fixDefect: (id, body) => call('POST', `/defects/${id}/fix`, body),
    importResults: (id, file) => call('POST', `/runs/${id}/import-results`, undefined, { form: form(file) }),
    importDocx: (id, file) => call('POST', `/runs/${id}/import-docx`, undefined, { form: form(file) }),
    exportRun: (id) => download(`/runs/${id}/export`, 'tracker.xlsx'),
    getReport: (id) => call('GET', `/runs/${id}/report`),
    downloadReportPdf: (id) => download(`/runs/${id}/report.pdf`, 'report.pdf'),
    getAuditLog: (id) => call('GET', `/runs/${id}/audit-log`),
    signOff: (id, body) => call('POST', `/runs/${id}/signoff`, body),
    listShareLinks: (id) => call('GET', `/runs/${id}/share-links`),
    createShareLink: (id, body) => call('POST', `/runs/${id}/share-links`, body),
    revokeShareLink: (id) => call('DELETE', `/share-links/${id}`),
    publicReport: (token) => call('GET', `/public/audit/${encodeURIComponent(token)}`, undefined, { auth: false }),
    downloadPublicPdf: (token) => download(`/public/audit/${encodeURIComponent(token)}/pdf`, 'report.pdf', false),
    subscribeRun(runId, onChange) {
      const token = tokenStore.get();
      let es: EventSource | null = null;
      let timer: number | undefined;
      if (token && 'EventSource' in window) {
        es = new EventSource(`${root}/runs/${runId}/events?access_token=${encodeURIComponent(token)}`);
        es.addEventListener('change', () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(onChange, 250);
        });
      }
      // Polling as a safety net when SSE drops (proxies, sleep).
      const poll = window.setInterval(onChange, es ? 30_000 : 10_000);
      return () => {
        es?.close();
        window.clearInterval(poll);
        window.clearTimeout(timer);
      };
    },
  };
}

const useMock = import.meta.env.VITE_MOCK === 'true';
export const api: Api = useMock ? createMockApi() : createHttpApi(import.meta.env.VITE_API_URL ?? 'http://localhost:4000');
