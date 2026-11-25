import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });

  return (
    <section>
      <h1>Learning Management System</h1>
      <p>
        API:{' '}
        {health.isPending
          ? 'checking…'
          : health.isError
            ? 'unreachable'
            : `${health.data.status} (database ${health.data.database})`}
      </p>
      <p>
        Signed in as:{' '}
        {me.isPending
          ? '…'
          : me.isError
            ? 'not signed in'
            : `${me.data.email} (${me.data.roles.join(', ') || 'no roles'})`}
      </p>
    </section>
  );
}
