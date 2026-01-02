import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useTopics, useTopic } from '../../hooks/useTopics';
import { apiClient } from '../../apiClient';

jest.mock('@tanstack/react-query');
jest.mock('../../apiClient');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useTopics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useQuery with correct parameters', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderHook(() => useTopics(false));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['topics', false],
      queryFn: expect.any(Function),
      staleTime: 0,
    });
  });

  it('includes includeInactive in query key', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderHook(() => useTopics(true));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['topics', true],
      })
    );
  });
});

describe('useTopic', () => {
  it('calls useQuery with topic id', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    renderHook(() => useTopic('topic-1'));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['topic', 'topic-1'],
      queryFn: expect.any(Function),
      staleTime: 0,
      enabled: true,
    });
  });

  it('disables query when id is empty', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    renderHook(() => useTopic(''));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

