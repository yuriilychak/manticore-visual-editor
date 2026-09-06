import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Menubar from '../Menubar';

const mockChangeLanguage = jest.fn<(language: string) => Promise<void>>();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { changeLanguage: mockChangeLanguage, language: 'en' },
    t: (key: string) => {
      const translations: Record<string, string> = {
        'menu.file.createFile': 'Create File',
        'menu.file.createProject': 'Create New Project',
        'menu.file.importFile': 'Import File',
        'menu.file.label': 'File',
        'menu.help.label': 'Help',
        'menu.help.language': 'Language',
        'menu.help.languages.english': 'English',
        'menu.help.languages.spanish': 'Spanish'
      };

      return translations[key];
    }
  })
}));

describe('Menubar', () => {
  beforeEach(() => {
    mockChangeLanguage.mockReset();
    mockChangeLanguage.mockResolvedValue(undefined);
  });

  test('shows configured File menu items and dispatches their action', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'File' }));

    screen.getByRole('menuitem', { name: 'Create File' });
    screen.getByRole('menuitem', { name: 'Import File' });
    await user.click(screen.getByRole('menuitem', { name: 'Create New Project' }));

    expect(onAction).toHaveBeenCalledWith('create-project');
  });

  test('switches localization from the Language submenu', async () => {
    const user = userEvent.setup();

    render(<Menubar onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Help' }));
    await user.click(screen.getByRole('menuitem', { name: 'Language' }));
    await user.click(screen.getByRole('menuitem', { name: 'Spanish' }));

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });
});
