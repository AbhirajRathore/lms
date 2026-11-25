import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** A validation problem, e.g. { path: ['title'], message: 'is required' }. */
export interface Problem {
  path: readonly PropertyKey[];
  message: string;
}

/** "title is required", "lessonIds[2] must be a string", or the bare message at the root. */
export function formatProblem({ path, message }: Problem): string {
  const field = path
    .map((key, i) => (typeof key === 'number' ? `[${key}]` : `${i > 0 ? '.' : ''}${String(key)}`))
    .join('');
  return field ? `${field} ${message}` : message;
}

/** 400 with Nest's default error body and one readable message per problem. */
export function validationError(problems: readonly Problem[]): BadRequestException {
  return new BadRequestException(problems.map(formatProblem));
}

/** Validates (and normalizes) a request body with a zod schema; 400 when it does not match. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw validationError(result.error.issues);
    return result.data;
  }
}
