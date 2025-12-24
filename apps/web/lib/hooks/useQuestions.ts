/**
 * useQuestions Hook
 * Fetches questions from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { QuestionCardDTO } from '@acta/shared';

export function useQuestions() {
  return useQuery({
    queryKey: ['questions'],
    queryFn: () => apiClient.get<QuestionCardDTO[]>('/questions'),
    staleTime: 0, // Always fetch fresh data on mount
  });
}


