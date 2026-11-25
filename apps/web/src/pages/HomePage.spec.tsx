import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import { HomePage } from './HomePage';

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'health').mockResolvedValue({ status: 'ok', database: 'up', version: '1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('welcomes authors and links to the catalogue and Manage', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      email: 'instructor@lms.local',
      roles: ['instructor'],
    });

    renderHome();

    expect(await screen.findByText('instructor@lms.local')).toBeInTheDocument();
    expect(screen.getByText(/\(instructor\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
    expect(screen.getByRole('link', { name: 'Manage courses' })).toHaveAttribute('href', '/manage');
    expect(await screen.findByText('API: ok (database up)')).toBeInTheDocument();
  });

  it('hides Manage from learners', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u2',
      email: 'learner@lms.local',
      roles: ['learner'],
    });

    renderHome();

    expect(await screen.findByText('learner@lms.local')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage courses' })).toBeNull();
  });

  it('shows a sign-in hint when the API says 401', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new ApiError(401, 'Unauthorized'));

    renderHome();

    expect(await screen.findByText(/You’re not signed in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toBeInTheDocument();
  });

  it('shows an alert for other account errors', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new ApiError(500, 'Internal server error'));

    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t load your account: Internal server error',
    );
  });
});
