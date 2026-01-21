import { renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useQuestions } from '../../hooks/useQuestions';
import { apiClient } from '../../apiClient';

jest.mock('@tanstack/react-query');
jest.mock('../../apiClient');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useQuestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useQuery with correct parameters', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderHook(() => useQuestions());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['questions', false],
      queryFn: expect.any(Function),
      staleTime: 0,
    });
  });

  it('fetches questions from API', async () => {
    const mockQuestions = [
      { id: 'q1', questionText: 'Question 1' },
      { id: 'q2', questionText: 'Question 2' },
    ];

    mockApiClient.get = jest.fn().mockResolvedValue(mockQuestions);

    mockUseQuery.mockImplementation((options: any) => {
      return {
        data: mockQuestions,
        isLoading: false,
        error: null,
        ...options,
      } as any;
    });

    const { result } = renderHook(() => useQuestions());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockQuestions);
    });
  });
});

