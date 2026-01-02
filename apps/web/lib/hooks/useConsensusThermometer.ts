/**
 * useConsensusThermometer Hook
 * Fetches consensus thermometer data from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { ConsensusThermometerDTO } from '@acta/shared';

export function useConsensusThermometer(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['consensus', questionId, month],
    queryFn: () => apiClient.get<ConsensusThermometerDTO>(
      `/consensus/${questionId}/thermometer`,
      month ? { month } : undefined
    ),
    staleTime: 0, // Always fetch fresh data on mount
    enabled: !!questionId,
  });
}
