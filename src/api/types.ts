/** Types come from the backend openapi.json (npm run gen:api). */
import type { components, paths } from './schema';

type S = components['schemas'];
export type Role = S['Role'];
export type CaseStatus = S['CaseStatus'];
export type RunStatus = S['RunStatus'];
export type DefectStatus = S['DefectStatus'];
export type User = S['User'];
export type AuthResult = S['AuthResult'];
export type InviteResult = S['InviteResult'];
export type InviteInfo = S['InviteInfo'];
export type Project = S['Project'];
export type ProjectBody = S['ProjectBody'];
export type TemplateCase = S['TemplateCase'];
export type TemplateCaseBody = S['TemplateCaseBody'];
export type Run = S['Run'];
export type RunBody = S['RunBody'];
export type RunCase = S['RunCase'];
export type Attachment = S['Attachment'];
export type CaseEvent = S['CaseEvent'];
export type ResultBody = S['ResultBody'];
export type ResultOutcome = S['ResultOutcome'];
export type Defect = S['Defect'];
export type DefectPatch = S['DefectPatch'];
export type FixBody = S['FixBody'];
export type RunStats = S['RunStats'];
export type ShareLink = S['ShareLink'];
export type ShareLinkBody = S['ShareLinkBody'];
export type SignOffBody = S['SignOffBody'];
export type AuditEntry = S['AuditEntry'];
export type AuditReport = S['AuditReport'];
export type PublicReport = paths['/public/audit/{token}']['get']['responses'][200]['content']['application/json'];
export type ImportResult = S['ImportResult'];
export type PresignResult = S['PresignResult'];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
    public details?: unknown,
  ) {
    super(message);
  }
}
