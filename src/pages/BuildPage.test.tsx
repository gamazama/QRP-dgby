import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildPage } from './BuildPage';

describe('BuildPage', () => {
  it('renders its heading', () => {
    render(<BuildPage />);
    expect(screen.getByRole('heading', { name: 'Build' })).toBeInTheDocument();
  });
});
