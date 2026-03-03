import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders cv nokta text', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const elements = screen.getAllByText(/cv nokta/i);
  expect(elements.length).toBeGreaterThan(0);
});
