import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { HistoryTimeline } from '../components/History';
import { RunCrumbs } from '../components/RunHeader';
import { Card, ErrorBox, PageLoading, StatusPill } from '../components/ui';
import { useAsync } from '../lib/useAsync';

export function CaseHistoryPage() {
  const { id = '', caseId = '' } = useParams();
  const run = useAsync(() => api.getRun(id), [id]);
  const cases = useAsync(() => api.listRunCases(id), [id]);
  const history = useAsync(() => api.getCaseHistory(caseId), [caseId]);
  if (run.error || history.error) return <ErrorBox error={run.error ?? history.error} />;
  if (!run.data || !history.data || !cases.data) return <PageLoading />;
  const c = cases.data.find((x) => x.id === caseId);
  return (
    <div className="max-w-3xl">
      <RunCrumbs run={run.data} here={`${c?.caseKey ?? 'Case'} history`} />
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        {c?.caseKey} {c?.title}
      </h1>
      {c && (
        <p className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          Now <StatusPill status={c.status} /> {c.module}
        </p>
      )}
      <Card className="p-6">
        <p className="mb-4 text-xs text-slate-500">Every result, fix and retest is kept. Nothing here can be edited.</p>
        <HistoryTimeline events={history.data} />
      </Card>
    </div>
  );
}
