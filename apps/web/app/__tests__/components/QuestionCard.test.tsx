import { render, screen } from '@testing-library/react';
import QuestionCard from '../../components/QuestionCard';
import type { QuestionCardDTO } from '@acta/shared';

const mockQuestion: QuestionCardDTO = {
  id: 'test-question-1',
  questionText: 'Is this a test question?',
  topicId: 'test-topic-1',
  topicName: 'Test Topic',
  contextBlurb: 'This is a test context blurb.',
  verdict: {
    id: 'test-verdict-1',
    verdictLabel: 'YesItSeemsSo',
    confidence: 85,
    month: '2024-01-01',
  },
  outlets: [
    { id: 'outlet-1', name: 'BBC' },
    { id: 'outlet-2', name: 'Guardian' },
  ],
  journalistCount: 10,
  publicationCount: 5,
};

describe('QuestionCard', () => {
  it('renders question text', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('Is this a test question?')).toBeInTheDocument();
  });

  it('renders topic name as eyebrow', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
  });

  it('renders context blurb when available', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('This is a test context blurb.')).toBeInTheDocument();
  });

  it('renders verdict text', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('Yes, it seems so.')).toBeInTheDocument();
  });

  it('renders journalist and publication counts', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText(/10/i)).toBeInTheDocument();
    expect(screen.getByText(/journalists/i)).toBeInTheDocument();
    expect(screen.getByText(/5/i)).toBeInTheDocument();
    expect(screen.getByText(/publications/i)).toBeInTheDocument();
  });

  it('renders outlet logos', () => {
    render(<QuestionCard question={mockQuestion} />);
    const logos = screen.getAllByAltText(/logo/i);
    expect(logos.length).toBeGreaterThan(0);
  });

  it('renders "View Answer" when verdict exists', () => {
    render(<QuestionCard question={mockQuestion} />);
    expect(screen.getByText('View Answer')).toBeInTheDocument();
  });

  it('renders "View Topic" when no verdict', () => {
    const questionWithoutVerdict = { ...mockQuestion, verdict: undefined };
    render(<QuestionCard question={questionWithoutVerdict} />);
    expect(screen.getByText('View Topic')).toBeInTheDocument();
  });

  it('links to question page', () => {
    render(<QuestionCard question={mockQuestion} />);
    const link = screen.getByRole('link', { name: /is this a test question/i });
    expect(link).toHaveAttribute('href', '/questions/test-question-1');
  });

  it('links topic eyebrow to topic page', () => {
    render(<QuestionCard question={mockQuestion} />);
    const topicLink = screen.getByRole('link', { name: 'Test Topic' });
    expect(topicLink).toHaveAttribute('href', '/topics/test-topic-1');
  });
});

