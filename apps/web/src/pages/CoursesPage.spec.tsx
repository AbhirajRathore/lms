import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoursesPage } from './CoursesPage';
import { api } from '../api/client';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CoursesPage />
    </QueryClientProvider>,
  );
}

describe('CoursesPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists published courses', async () => {
    vi.spyOn(api, 'courses').mockResolvedValue([
      {
        id: 'c1',
        title: 'Onboarding 101',
        description: 'Start here',
        published: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    renderPage();
    expect(await screen.findByText('Onboarding 101')).toBeInTheDocument();
  });

  it('shows an error when the API fails', async () => {
    vi.spyOn(api, 'courses').mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load courses.');
  });
});
