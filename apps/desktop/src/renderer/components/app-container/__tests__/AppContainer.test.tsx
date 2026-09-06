import { describe, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import AppContainer from '../AppContainer';

jest.mock('../app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('../renderer', () => ({ Renderer: () => <div>Renderer content</div> }));

describe('AppContainer', () => {
  test('renders the renderer inside the application shell', () => {
    render(<AppContainer />);

    screen.getByText('Renderer content');
  });
});
