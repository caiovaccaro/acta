/**
 * useDebateCard Hook
 * Fetches debate card data from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { DebateCardDTO } from '@acta/shared';

export function useDebateCard(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['debate', questionId, month],
    queryFn: () => apiClient.get<DebateCardDTO>(
      `/debate/${questionId}`,
      month ? { month } : undefined
    ),
    staleTime: 0, // Always fetch fresh data on mount
    enabled: !!questionId,
  });
}
