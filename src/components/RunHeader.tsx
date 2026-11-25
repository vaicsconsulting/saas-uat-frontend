import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { Run } from '../api/types';
import { Badge } from './ui';

export function RunCrumbs({ run, here }: { run: Run; here?: string }) {
  return (
    <nav className="mb-2 text-sm text-slate-500">
      <Link to="/" className="hover:text-navy">
        Projects
      </Link>{' '}
      /{' '}
      <Link to={`/projects/${run.projectId}`} className="hover:text-navy">
        {run.projectName}
      </Link>{' '}
      /{' '}
      {here ? (
        <>
          <Link to={`/runs/${run.id}`} className="hover:text-navy">
            {run.name}
          </Link>{' '}
          / {here}
        </>
      ) : (
        run.name
      )}
    </nav>
  );
}

export function LockedBanner({ run }: { run: Run }) {
  if (!run.lockedAt) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-900">
      <Lock className="h-4 w-4" />
      Signed off and locked. No more edits. Report {run.reportId}
      {run.reportHash && <span className="truncate font-mono text-xs text-green-800/80">hash {run.reportHash.slice(0, 16)}...</span>}
    </div>
  );
}

export function RunMeta({ run }: { run: Run }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <Badge>{run.environment}</Badge>
      {run.buildTag && <Badge>Build {run.buildTag}</Badge>}
      {run.clientName && <Badge>Client {run.clientName}</Badge>}
      {run.status === 'SIGNED_OFF' ? <Badge className="bg-green-50 text-pass">Signed off</Badge> : <Badge className="bg-navy-50 text-navy">In progress</Badge>}
    </div>
  );
}
