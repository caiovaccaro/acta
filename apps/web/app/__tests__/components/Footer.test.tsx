import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer', () => {
  it('renders the footer component', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    const copyright = screen.getByText(/© 2025 Acta/i);
    expect(copyright).toBeInTheDocument();
  });

  it('renders Acta logo', () => {
    render(<Footer />);
    const logoText = screen.getByText('Acta');
    expect(logoText).toBeInTheDocument();
  });

  it('renders privacy and terms links', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });
});

