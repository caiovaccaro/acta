import { render, screen } from '@testing-library/react';
import TopicCard from '../../components/TopicCard';
import type { TopicDTO } from '@acta/shared';

const mockTopic: TopicDTO = {
  id: 'test-topic-1',
  name: 'Test Topic',
  description: 'This is a test topic description',
  questionCount: 5,
  activeQuestionCount: 3,
};

describe('TopicCard', () => {
  it('renders topic name', () => {
    render(<TopicCard topic={mockTopic} />);
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
  });

  it('renders question count', () => {
    render(<TopicCard topic={mockTopic} />);
    expect(screen.getByText(/3/i)).toBeInTheDocument();
  });

  it('links to topic page', () => {
    render(<TopicCard topic={mockTopic} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/topics/test-topic-1');
  });
});



