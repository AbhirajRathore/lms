import type { CourseSummary, CurrentUser, HealthResponse } from '@lms/shared';

const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// TODO: replace with the Cognito session token once sign-in is wired up.
function authToken(): string | undefined {
  return import.meta.env.DEV ? import.meta.env.VITE_DEV_TOKEN : undefined;
}

async function get<T>(path: string): Promise<T> {
  const token = authToken();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => get<HealthResponse>('/health'),
  me: () => get<CurrentUser>('/me'),
  courses: () => get<CourseSummary[]>('/courses'),
};
