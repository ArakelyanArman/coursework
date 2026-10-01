// @ts-check
import { Button, IconButton, setIcon, setLabel, setLoading } from '../../components/Button/Button.js';
import { Icon } from '../../components/Icon/Icon.js';
import { qs, render } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { ApiError } from '../core/http.js';
import { getLanguage, initI18n, setAttrText, setLanguage, setText, t } from '../core/i18n.js';
import { refs } from '../core/template.js';
import { getTheme, initTheme, toggleTheme } from '../core/theme.js';
import { getDemoCounts, hasDemoData, resetDemoData } from '../services/demo.js';
import { renderComponents } from './design/components.js';
import { renderContent } from './design/content.js';
import { renderColors, renderFoundations } from './design/foundations.js';

/** @type {HTMLElement} */
let languageButton;
/** @type {HTMLElement} */
let themeButton;
/** @type {HTMLElement} */
let resetButton;

// Built after the translations have loaded, so their labels resolve.
function createControls() {
  languageButton = Button({
    label: '',
    variant: 'ghost',
    icon: 'languages',
    onClick: () => setLanguage(getLanguage() === 'en' ? 'hy' : 'en'),
  });
  themeButton = IconButton({ icon: 'moon', label: { key: 'theme.switchToDark' }, onClick: () => toggleTheme() });
  resetButton = Button({ label: { key: 'design.data.reset' }, variant: 'secondary', onClick: resetData });
}

function syncControls() {
  const english = getLanguage() === 'en';
  setText(refs(languageButton).label, { key: english ? 'language.shortEn' : 'language.shortHy' });
  setAttrText(languageButton, 'aria-label', { key: english ? 'language.switchToHy' : 'language.switchToEn' });

  const dark = getTheme() === 'dark';
  setIcon(themeButton, dark ? 'sun' : 'moon');
  setLabel(themeButton, { key: dark ? 'theme.switchToLight' : 'theme.switchToDark' });
}

async function renderData() {
  if (!hasDemoData) return;
  qs('#data').hidden = false;
  qs('#data-link').hidden = false;
  const counts = await getDemoCounts();
  if (!counts) return;
  qs('#data-counts').textContent = [
    t('catalog.resultCount', { count: counts.books }),
    t('design.data.users', { count: counts.users }),
    t('design.data.bookings', { count: counts.bookings }),
  ].join(' · ');
}

async function resetData() {
  const status = qs('#data-status');
  setLoading(resetButton, true);
  setText(status, null);
  try {
    await resetDemoData();
    await Promise.all([renderData(), renderContent()]);
    setText(status, { key: 'design.data.resetDone' });
  } catch (error) {
    setText(status, { key: error instanceof ApiError ? error.messageKey : 'errors.unknown' });
  } finally {
    setLoading(resetButton, false);
  }
}

async function init() {
  initTheme();
  await initI18n();

  createControls();
  render(qs('#brand-mark'), Icon('book-open', 18));
  render(qs('#bar-actions'), languageButton, themeButton);
  qs('#data-reset').replaceWith(resetButton);

  syncControls();
  renderFoundations();
  renderComponents();
  renderData();
  renderContent();

  on(EVENTS.LANG_CHANGE, () => {
    syncControls();
    renderFoundations();
    renderData();
  });
  on(EVENTS.THEME_CHANGE, () => {
    syncControls();
    renderColors();
  });
}

init();
