// @ts-check
import { Button, setLoading } from '../../components/Button/Button.js';
import { qs } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { ApiError } from '../core/http.js';
import { setText, t } from '../core/i18n.js';
import { getDemoCounts, hasDemoData, resetDemoData } from '../services/demo.js';
import { mountShell } from '../shell.js';
import { renderComponents } from './design/components.js';
import { renderContent } from './design/content.js';
import { renderColors, renderFoundations } from './design/foundations.js';
import { renderShell } from './design/shell.js';

/** @type {HTMLElement} */
let resetButton;

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
  await mountShell({ page: 'design' });

  resetButton = Button({
    label: { key: 'design.data.reset' },
    variant: 'secondary',
    onClick: resetData,
  });
  qs('#data-reset').replaceWith(resetButton);

  renderFoundations();
  renderComponents();
  renderShell();
  renderData();
  renderContent();

  on(EVENTS.LANG_CHANGE, () => {
    renderFoundations();
    renderData();
  });
  on(EVENTS.THEME_CHANGE, renderColors);
}

init();
