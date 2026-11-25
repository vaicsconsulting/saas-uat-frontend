import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button, ErrorBox, Field, PageLoading } from '../components/ui';
import { inputCls } from '../lib/styles';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/format';
import { errText } from '../lib/toast';
import { useAsync } from '../lib/useAsync';
import { AuthShell } from './LoginPage';

export function InvitePage() {
  const { token = '' } = useParams();
  const { signIn } = useAuth();
  const nav = useNavigate();
  const inv = useAsync(() => api.getInvite(token), [token]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setErr('Use at least 8 characters');
    setBusy(true);
    setErr('');
    try {
      const r = await api.acceptInvite(token, name, password);
      signIn(r.token, r.user);
      nav('/', { replace: true });
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Join VAICS UAT">
      {inv.loading && !inv.data ? (
        <PageLoading />
      ) : inv.error ? (
        <ErrorBox error={inv.error} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">
            You are invited as <b>{ROLE_LABEL[inv.data!.role]}</b> with {inv.data!.email}.
          </p>
          <Field label="Your name">
            <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input className={inputCls} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {err && <p className="text-sm text-fail">{err}</p>}
          <Button className="w-full" disabled={busy}>
            {busy ? 'Saving...' : 'Create account'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
