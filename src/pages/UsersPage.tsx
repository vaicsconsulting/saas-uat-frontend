import { useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import { api } from '../api/client';
import type { Role } from '../api/types';
import { Button, Card, ErrorBox, Field, PageLoading } from '../components/ui';
import { inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL, fmtDateTime } from '../lib/format';
import { errText, useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

const ROLES: Role[] = ['ADMIN', 'TESTER', 'DEVELOPER', 'VIEWER'];

export function UsersPage() {
  const { user, can } = useAuth();
  const toast = useToast();
  const users = useAsync(() => api.listUsers(), []);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('TESTER');
  const [link, setLink] = useState<{ url: string; expires: string } | null>(null);

  if (!can('ADMIN')) return <ErrorBox error={new Error('Only admins can manage people')} />;

  async function invite(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api.createInvite({ email, role });
      setLink({ url: r.inviteUrl, expires: r.expiresAt });
      setEmail('');
    } catch (x) {
      toast('error', errText(x));
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">People</h1>
      <p className="mb-6 text-sm text-slate-500">Invite testers, developers and viewers. Each invite link works once.</p>
      <Card className="mb-6 p-5">
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Email">
              <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="Role">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Button>Create invite link</Button>
        </form>
        {link && (
          <div className="mt-4 rounded-lg bg-navy-50 p-3 text-sm">
            <p className="mb-1 text-slate-700">Send this link to the person. It expires {fmtDateTime(link.expires)}.</p>
            <div className="flex gap-2">
              <input readOnly value={link.url} className={inputCls} onFocus={(e) => e.target.select()} />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(link.url);
                  toast('ok', 'Link copied');
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        )}
      </Card>
      {users.error ? (
        <ErrorBox error={users.error} />
      ) : !users.data ? (
        <PageLoading />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy text-left text-xs font-semibold text-white">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                      value={u.role}
                      disabled={u.id === user?.id}
                      onChange={(e) =>
                        api
                          .updateUser(u.id, { role: e.target.value as Role })
                          .then(() => {
                            toast('ok', 'Role saved');
                            users.reload();
                          })
                          .catch((x) => toast('error', errText(x)))
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      disabled={u.id === user?.id}
                      className="text-sm font-medium text-navy hover:underline disabled:text-slate-400 disabled:no-underline"
                      onClick={() =>
                        api
                          .updateUser(u.id, { active: !u.active })
                          .then(() => users.reload())
                          .catch((x) => toast('error', errText(x)))
                      }
                    >
                      {u.active ? 'Active. Turn off' : 'Off. Turn on'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
