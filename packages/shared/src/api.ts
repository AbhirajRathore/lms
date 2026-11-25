import type { Role } from './roles.js';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  version: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  roles: Role[];
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  createdAt: string;
}
