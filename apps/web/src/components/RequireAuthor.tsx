import type { ReactNode } from 'react';
import { useMe } from '../hooks/useMe';

/** Renders children only for admins and instructors. */
export function RequireAuthor({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isPending) return <p className="muted">Loading…</p>;
  // Decide from the last known user: a failed background refetch of /me (e.g. after switching
  // tabs while the API restarts) must not unmount the editor and lose unsaved form input.
  if (!me.data) return <p className="error">You need to sign in.</p>;
  if (!me.canAuthor) {
    return <p className="error">Only admins and instructors can manage courses.</p>;
  }
  return <>{children}</>;
}
