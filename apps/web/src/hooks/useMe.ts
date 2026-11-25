import { useQuery } from '@tanstack/react-query';
import { canAuthor } from '@lms/shared';
import { api } from '../api/client';

export const ME_QUERY_KEY = ['me'] as const;

/** The signed-in user, plus whether they may author courses. */
export function useMe() {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: api.me, retry: false });
  return { ...query, canAuthor: query.data ? canAuthor(query.data.roles) : false };
}
