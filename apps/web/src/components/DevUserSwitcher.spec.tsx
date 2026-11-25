import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { DEV_USERS, getDevToken } from '../api/dev-auth';
import { useMe } from '../hooks/useMe';
import { DevUserSwitcher } from './DevUserSwitcher';

function WhoAmI() {
  const me = useMe();
  return <p>{me.data ? `Signed in as ${me.data.email}` : 'Loading'}</p>;
}

describe('DevUserSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('lms.devToken', 'learner@lms.local:learner');
    vi.spyOn(api, 'me').mockImplementation(async () => {
      const [email = ''] = (getDevToken() ?? '').split(':');
      return { id: email, email, roles: [] };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('switches the stored token and refetches queries as the new user', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DevUserSwitcher />
        <WhoAmI />
      </QueryClientProvider>,
    );

    client.setQueryData(['courses'], ['cached for the learner']);
    const select = screen.getByLabelText('Sign in as');
    expect(select).toHaveValue('learner@lms.local:learner');
    expect(await screen.findByText('Signed in as learner@lms.local')).toBeInTheDocument();

    const admin = DEV_USERS[0]!;
    fireEvent.change(select, { target: { value: admin.token } });

    expect(getDevToken()).toBe(admin.token);
    expect(select).toHaveValue(admin.token);
    expect(await screen.findByText('Signed in as admin@lms.local')).toBeInTheDocument();
    expect(api.me).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(['courses'])).toBeUndefined();
  });
});
