/**
 * useTopics Hook
 * Fetches topics from the API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import type { TopicDTO } from '@acta/shared';

export function useTopics(includeInactive = false) {
  return useQuery({
    queryKey: ['topics', includeInactive],
    queryFn: () => apiClient.get<TopicDTO[]>('/topics', { 
      includeInactive: String(includeInactive) 
    }),
    staleTime: 0, // Always fetch fresh data on mount
  });
}

export function useTopic(id: string) {
  return useQuery({
    queryKey: ['topic', id],
    queryFn: () => apiClient.get<import('@acta/shared').TopicDetailDTO>(`/topics/${id}`),
    staleTime: 0,
    enabled: !!id,
  });
}

export function useTopicById(id: string) {
  return useTopic(id);
}
