import { Link, NavLink, Outlet } from 'react-router';
import { ApiError } from '../api/client';
import { useMe } from '../hooks/useMe';
import { DevUserSwitcher } from './DevUserSwitcher';
import './layout.css';

function SignedInUser() {
  const me = useMe();
  if (me.isPending) return null;
  if (me.isError) {
    const signedOut = me.error instanceof ApiError && me.error.status === 401;
    return <span className="muted">{signedOut ? 'Not signed in' : 'Account unavailable'}</span>;
  }
  return (
    <span className="app-user-identity">
      <span className="app-user-email">{me.data.email}</span>
      <span className="badge">{me.data.roles.join(', ') || 'no role'}</span>
    </span>
  );
}

export function Layout() {
  const me = useMe();

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand">
            LMS
          </Link>
          <nav aria-label="Main" className="app-nav">
            <NavLink to="/" end className="app-nav-link">
              Home
            </NavLink>
            <NavLink to="/courses" className="app-nav-link">
              Courses
            </NavLink>
            {me.canAuthor && (
              <NavLink to="/manage" className="app-nav-link">
                Manage
              </NavLink>
            )}
          </nav>
          <div className="app-user">
            <SignedInUser />
            {import.meta.env.DEV && <DevUserSwitcher />}
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </>
  );
}
