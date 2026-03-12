import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { CountryOpinionDTO } from '@acta/shared';

export function useCountryStances(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['country-stances', questionId, month],
    queryFn: () => {
      const qs = month ? `?month=${encodeURIComponent(month)}` : '';
      return apiClient.get<CountryOpinionDTO[]>(`/questions/${questionId}/country-stances${qs}`);
    },
    staleTime: 0,
    enabled: !!questionId,
  });
}

