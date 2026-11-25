import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Friendly "not found" panel with a way back. */
export function NotFound({
  title,
  backTo,
  backLabel,
  children,
}: {
  title: string;
  backTo: string;
  backLabel: string;
  children?: ReactNode;
}) {
  return (
    <section className="empty learn-not-found">
      <h1>{title}</h1>
      {children}
      <p>
        <Link to={backTo}>{backLabel}</Link>
      </p>
    </section>
  );
}

/** Shown on unpublished courses, which only their authors (and admins) can open. */
export function DraftNotice() {
  return <p className="learn-notice">Preview — only authors see this draft.</p>;
}
