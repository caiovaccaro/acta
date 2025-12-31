/**
 * useQuestion Hook
 * Fetches a single question by ID from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { QuestionCardDTO } from '@acta/shared';

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => apiClient.get<QuestionCardDTO>(`/questions/${id}`),
    staleTime: 0,
    enabled: !!id,
  });
}




