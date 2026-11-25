import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ApiError, api } from '../api/client';
import { useMe } from '../hooks/useMe';

function SignInHint({ error }: { error: Error }) {
  if (!(error instanceof ApiError && error.status === 401)) {
    return (
      <p className="alert" role="alert">
        Couldn’t load your account: {error.message}
      </p>
    );
  }
  return (
    <p>
      You’re not signed in.{' '}
      {import.meta.env.DEV
        ? 'Pick a user from “Sign in as” in the header.'
        : 'Sign in to see your courses.'}
    </p>
  );
}

export function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const me = useMe();

  return (
    <section className="stack">
      <div>
        <h1>{me.data ? 'Welcome back' : 'Learning Management System'}</h1>
        {me.isPending ? (
          <p className="muted">Checking who you are…</p>
        ) : me.isError ? (
          <SignInHint error={me.error} />
        ) : (
          <p>
            Signed in as <strong>{me.data.email}</strong> ({me.data.roles.join(', ') || 'no roles'})
          </p>
        )}
      </div>

      <div className="row">
        <Link className="btn btn-primary" to="/courses">
          Browse courses
        </Link>
        {me.canAuthor && (
          <Link className="btn" to="/manage">
            Manage courses
          </Link>
        )}
      </div>

      <p className="muted">
        API:{' '}
        {health.isPending
          ? 'checking…'
          : health.isError
            ? 'unreachable'
            : `${health.data.status} (database ${health.data.database})`}
      </p>
    </section>
  );
}
