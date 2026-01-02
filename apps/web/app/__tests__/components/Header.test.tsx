import { render, screen } from '@testing-library/react';
import Header from '../../components/Header';

describe('Header', () => {
  it('renders the header component', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('renders the Acta logo text', () => {
    render(<Header />);
    const logoText = screen.getByText('Acta');
    expect(logoText).toBeInTheDocument();
  });

  it('renders logo link to home', () => {
    render(<Header />);
    const homeLink = screen.getByRole('link', { name: /acta/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });
});

