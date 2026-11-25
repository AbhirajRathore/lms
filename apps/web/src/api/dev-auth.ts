/**
 * Local-only sign-in: the API's dev verifier accepts "<email>:<role>,<role>" as a bearer token.
 * Replaced by identity-provider sign-in later; never used in production builds.
 */
export interface DevUser {
  label: string;
  token: string;
}

export const DEV_USERS: DevUser[] = [
  { label: 'Admin (admin@lms.local)', token: 'admin@lms.local:admin' },
  { label: 'Instructor (instructor@lms.local)', token: 'instructor@lms.local:instructor' },
  { label: 'Instructor 2 (instructor2@lms.local)', token: 'instructor2@lms.local:instructor' },
  { label: 'Learner (learner@lms.local)', token: 'learner@lms.local:learner' },
];

const STORAGE_KEY = 'lms.devToken';

export function getDevToken(): string | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Storage blocked: fall back to the env default.
  }
  return import.meta.env.VITE_DEV_TOKEN || undefined;
}

export function setDevToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage blocked: the choice lasts until reload only via the env default.
  }
}
