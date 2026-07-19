import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.jsx';

describe('App', () => {
  it('identifies the system and current phase', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /DD Auto Spa management system/i })).toBeTruthy();
    expect(screen.getByText(/Phase 1/i)).toBeTruthy();
  });
});
