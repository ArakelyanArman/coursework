// @ts-check
import { EVENTS, on } from '../../js/core/events.js';
import { getTheme, toggleTheme } from '../../js/core/theme.js';
import { IconButton, setIcon, setLabel } from '../Button/Button.js';

/** @returns {HTMLElement} */
export function ThemeToggle() {
  const button = IconButton({
    icon: 'moon',
    label: { key: 'theme.switchToDark' },
    onClick: () => toggleTheme(),
  });
  const sync = () => {
    const dark = getTheme() === 'dark';
    setIcon(button, dark ? 'sun' : 'moon');
    setLabel(button, { key: dark ? 'theme.switchToLight' : 'theme.switchToDark' });
  };
  sync();
  on(EVENTS.THEME_CHANGE, sync);
  return button;
}
