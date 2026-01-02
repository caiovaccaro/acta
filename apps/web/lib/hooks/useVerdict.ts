/**
 * useVerdict Hook
 * Fetches verdict data from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { VerdictCardDTO, VerdictDTO } from '@acta/shared';

export function useVerdict(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['verdict', questionId, month],
    queryFn: () => {
      if (month) {
        return apiClient.get<VerdictCardDTO>(`/verdicts/${questionId}/${month}`);
      }
      return apiClient.get<VerdictCardDTO>(`/verdicts/${questionId}/current`);
    },
    staleTime: 0, // Always fetch fresh data on mount
    enabled: !!questionId,
  });
}

export function useVerdictHistory(questionId: string, limit = 12) {
  return useQuery({
    queryKey: ['verdict-history', questionId, limit],
    queryFn: () => apiClient.get<VerdictDTO[]>(`/verdicts/${questionId}`, { 
      limit: String(limit) 
    }),
    staleTime: 0,
    enabled: !!questionId,
  });
}
