import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders hr ai text', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const elements = screen.getAllByText(/hr ai|hr\.ai/i);
  expect(elements.length).toBeGreaterThan(0);
});
