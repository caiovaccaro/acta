import { render, screen, waitFor } from '@testing-library/react';
import NextCause from '../../components/NextCause';
import { useTopics } from '../../../lib/hooks/useTopics';
import { useQuestions } from '../../../lib/hooks/useQuestions';

jest.mock('../../../lib/hooks/useTopics');
jest.mock('../../../lib/hooks/useQuestions');

const mockUseTopics = useTopics as jest.MockedFunction<typeof useTopics>;
const mockUseQuestions = useQuestions as jest.MockedFunction<typeof useQuestions>;

describe('NextCause', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders next question when available', async () => {
    mockUseTopics.mockReturnValue({
      data: [
        { 
          id: 'topic-1', 
          name: 'Topic 1', 
          questionCount: 2, 
          activeQuestionCount: 2,
          description: null,
          safetyNoteRequired: false,
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    mockUseQuestions.mockReturnValue({
      data: [
        { 
          id: 'q1', 
          questionText: 'Question 1', 
          topicId: 'topic-1',
          isActive: true,
          topicName: 'Topic 1',
          outlets: [],
        },
        { 
          id: 'q2', 
          questionText: 'Question 2', 
          topicId: 'topic-1',
          isActive: true,
          topicName: 'Topic 1',
          outlets: [],
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<NextCause currentQuestionId="q1" />);

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders "Next Debate" label when next question exists', async () => {
    mockUseTopics.mockReturnValue({
      data: [
        { 
          id: 'topic-1', 
          name: 'Topic 1', 
          questionCount: 1, 
          activeQuestionCount: 1,
          description: null,
          safetyNoteRequired: false,
          createdAt: new Date().toISOString(),
          firstQuestion: {
            id: 'q1',
            questionText: 'Question 1',
            isActive: true,
          },
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    mockUseQuestions.mockReturnValue({
      data: [
        { 
          id: 'q1', 
          questionText: 'Question 1', 
          topicId: 'topic-1',
          isActive: true,
          topicName: 'Topic 1',
          outlets: [],
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<NextCause currentTopicId="topic-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/next debate/i)).toBeInTheDocument();
    });
  });

  it('returns null when no next question available', () => {
    mockUseTopics.mockReturnValue({ data: [], isLoading: false, error: null } as any);
    mockUseQuestions.mockReturnValue({ data: [], isLoading: false, error: null } as any);

    const { container } = render(<NextCause />);
    expect(container.firstChild).toBeNull();
  });
});

