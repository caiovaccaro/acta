/**
 * useQuestions Hook
 * Fetches questions from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { QuestionCardDTO } from '@acta/shared';

type Bucket = 'all' | 'consensus' | 'under-debate';

export function useQuestions(options?: { featuredOnly?: boolean; bucket?: Bucket }) {
  const params: string[] = [];
  if (options?.featuredOnly) params.push('featured=true');
  if (options?.bucket && options.bucket !== 'all') params.push(`bucket=${options.bucket}`);
  const queryString = params.length ? `?${params.join('&')}` : '';

  return useQuery({
    queryKey: ['questions', options?.featuredOnly ?? false, options?.bucket ?? 'all'],
    queryFn: () => apiClient.get<QuestionCardDTO[]>(`/questions${queryString}`),
    staleTime: 0,
  });
}




