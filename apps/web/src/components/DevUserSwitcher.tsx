import { useId, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEV_USERS, getDevToken, setDevToken } from '../api/dev-auth';

/** Local development only: pick which seeded user the API sees. */
export function DevUserSwitcher() {
  const id = useId();
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getDevToken() ?? '');
  const isKnownUser = DEV_USERS.some((user) => user.token === token);

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setDevToken(next);
    setToken(next);
    // Wipe every cached result of the previous user and refetch what is on screen as the new one.
    // (clear() would empty the cache but leave mounted queries showing the old user's data.)
    void queryClient.resetQueries();
  }

  return (
    <div className="dev-switcher">
      <label htmlFor={id}>Sign in as</label>
      <select id={id} value={token} onChange={onChange}>
        {!isKnownUser && (
          <option value={token} disabled>
            {token ? 'Custom token' : 'Choose a user…'}
          </option>
        )}
        {DEV_USERS.map((user) => (
          <option key={user.token} value={user.token}>
            {user.label}
          </option>
        ))}
      </select>
    </div>
  );
}
