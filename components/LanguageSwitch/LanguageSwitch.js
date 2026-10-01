// @ts-check
import { getLanguage, setAttrText, setLanguage } from '../../js/core/i18n.js';
import { Button } from '../Button/Button.js';

/**
 * Shows the current language code; the label names the other language. Both texts are
 * translations, so the button follows a language switch by itself.
 * @returns {HTMLElement}
 */
export function LanguageSwitch() {
  const button = Button({
    label: { key: 'language.code' },
    variant: 'ghost',
    icon: 'languages',
    onClick: () => setLanguage(getLanguage() === 'en' ? 'hy' : 'en'),
  });
  setAttrText(button, 'aria-label', { key: 'language.switchToOther' });
  setAttrText(button, 'data-tooltip', { key: 'language.switchToOther' });
  return button;
}
