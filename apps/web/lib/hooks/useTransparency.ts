/**
 * useTransparency Hook
 * Fetches transparency data from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { TransparencyDTO, MethodologyDTO } from '@acta/shared';

export function useTransparency(ideology?: 'Left' | 'Center' | 'Right') {
  return useQuery({
    queryKey: ['transparency', ideology],
    queryFn: () => apiClient.get<TransparencyDTO>(
      '/transparency/outlets',
      ideology ? { ideology } : undefined
    ),
    staleTime: 0,
  });
}

export function useMethodology() {
  return useQuery({
    queryKey: ['methodology'],
    queryFn: () => apiClient.get<MethodologyDTO>('/transparency/methodology'),
    staleTime: 0,
  });
}
