import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import OperationalHealthPanel from '../../admin/components/OperationalHealthPanel';

describe('OperationalHealthPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows stale run state, queues, moderation, and budget', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        authorized: true,
        overall: 'stale',
        run: { status: 'stale', lastStatus: 'running' },
        freshness: { status: 'stale', lastFinishedAt: '2026-10-09T12:00:00.000Z' },
        queues: { status: 'ok', pending: 4, inProgress: 1, failed: 2 },
        moderation: { status: 'ok', topicsPending: 5, questionsPending: 3 },
        budget: { status: 'ok', remainingUsd: '18.500000', ceilingUsd: '30.000000' },
      },
    });

    render(<OperationalHealthPanel />);

    expect(screen.getByTestId('operational-overall')).toHaveTextContent('stale');
    expect(screen.getByText(/pending 4/)).toBeInTheDocument();
    expect(screen.getByText(/topics 5/)).toBeInTheDocument();
    expect(screen.getByText(/questions 3/)).toBeInTheDocument();
    expect(screen.getByText(/18.500000 of 30.000000 USD remaining/)).toBeInTheDocument();
  });
});
