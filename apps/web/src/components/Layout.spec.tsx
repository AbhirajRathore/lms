import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@lms/shared';
import { ApiError, api } from '../api/client';
import { Layout } from './Layout';

function renderLayout(path = '/courses') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<p>Page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signInAs(email: string, roles: Role[]) {
  vi.spyOn(api, 'me').mockResolvedValue({ id: 'u1', email, roles });
}

describe('Layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the signed-in user, the page and an active nav link', async () => {
    signInAs('learner@lms.local', ['learner']);

    renderLayout('/courses');

    expect(await screen.findByText('learner@lms.local')).toBeInTheDocument();
    expect(screen.getByText('learner')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LMS' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Courses' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull();
    expect(screen.getByLabelText('Sign in as')).toBeInTheDocument();
  });

  it('shows Manage to authors', async () => {
    signInAs('instructor@lms.local', ['instructor']);

    renderLayout('/');

    expect(await screen.findByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/manage');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('says so when nobody is signed in', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new ApiError(401, 'Unauthorized'));

    renderLayout('/');

    expect(await screen.findByText('Not signed in')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull();
  });

  it('does not claim the user is signed out when the API fails', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new ApiError(500, 'Internal server error'));

    renderLayout('/');

    expect(await screen.findByText('Account unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Not signed in')).toBeNull();
  });
});
