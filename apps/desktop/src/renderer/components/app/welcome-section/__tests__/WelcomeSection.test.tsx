import { describe, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import WelcomeSection from '../WelcomeSection';

describe('WelcomeSection', () => {
  test('renders its title and content', () => {
    render(
      <WelcomeSection title="Section title">
        <div>Section content</div>
      </WelcomeSection>
    );

    screen.getByRole('heading', { name: 'Section title' });
    screen.getByText('Section content');
  });
});
