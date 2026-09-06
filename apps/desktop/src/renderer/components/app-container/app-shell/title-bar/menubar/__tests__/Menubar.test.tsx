import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Menubar from '../Menubar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => {
      const translations: Record<string, string> = {
        'menu.file.createFile': 'New file',
        'menu.file.createProject': 'New project',
        'menu.file.createWindow': 'New window',
        'menu.file.importFile': 'Import file',
        'menu.file.importProject': 'Import project',
        'menu.file.openProject': 'Open project',
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
  test('shows configured File menu items and dispatches their action', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar disabledItemIds={[]} onAction={onAction} selectedActionIds={[]} />);

    await user.click(screen.getByRole('button', { name: 'File' }));

    screen.getByRole('menuitem', { name: 'New file' });
    screen.getByRole('menuitem', { name: 'New project' });
    screen.getByRole('menuitem', { name: 'New window' });
    screen.getByRole('menuitem', { name: 'Import file' });
    screen.getByRole('menuitem', { name: 'Import project' });
    expect(screen.getAllByRole('separator')).toHaveLength(2);

    await user.click(screen.getByRole('menuitem', { name: 'Open project' }));

    expect(onAction).toHaveBeenCalledWith('open-project');
  });

  test('dispatches language selection from the Language submenu', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar disabledItemIds={[]} onAction={onAction} selectedActionIds={[]} />);

    await user.click(screen.getByRole('button', { name: 'Help' }));
    await user.click(screen.getByRole('menuitem', { name: 'Language' }));
    await user.click(screen.getByRole('menuitem', { name: 'Spanish' }));

    expect(onAction).toHaveBeenCalledWith('set-language-es');
  });

  test('disables supplied action items without dispatching them', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();

    render(<Menubar disabledItemIds={['create-project']} onAction={onAction} selectedActionIds={[]} />);

    await user.click(screen.getByRole('button', { name: 'File' }));
    const createProject = screen.getByRole('menuitem', { name: 'New project' });

    expect(createProject).toHaveAttribute('aria-disabled', 'true');
    expect(onAction).not.toHaveBeenCalled();
  });

  test('disables supplied top-level menus', () => {
    render(<Menubar disabledItemIds={['file']} onAction={jest.fn()} selectedActionIds={[]} />);

    const fileButton = screen.getByRole('button', { name: 'File' });
    expect(fileButton).toBeDisabled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
