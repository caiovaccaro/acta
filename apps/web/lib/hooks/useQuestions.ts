/**
 * useQuestions Hook
 * Fetches questions from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { QuestionCardDTO } from '@acta/shared';

export function useQuestions(options?: { featuredOnly?: boolean }) {
  const query = options?.featuredOnly ? '?featured=true' : '';
  return useQuery({
    queryKey: ['questions', options?.featuredOnly ?? false],
    queryFn: () => apiClient.get<QuestionCardDTO[]>(`/questions${query}`),
    staleTime: 0, // Always fetch fresh data on mount
  });
}




