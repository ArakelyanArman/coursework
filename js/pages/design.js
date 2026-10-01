// @ts-check
// Entry module for design.html: the dev-only living style guide.
// Phase 1 covers foundations; component sections are added in Phase 3.
import { ICON_NAMES, Icon } from '../components/icon.js';
import { addDays, diffDays, todayIso } from '../core/date.js';
import { h, qs, render } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import {
  formatDate,
  formatDateRange,
  formatNumber,
  formatTypedDate,
  parseTypedDate,
  weekdayNames,
} from '../core/format.js';
import { diffKeys, getLanguage, hasIntlLocale, initI18n, setLanguage, t } from '../core/i18n.js';
import { getTheme, initTheme, toggleTheme } from '../core/theme.js';

/** [token, token used for the sample text on top of it], both without the `--color-` prefix. */
const COLOR_GROUPS = /** @type {const} */ ([
  [
    'neutrals',
    [
      ['bg', 'text'],
      ['surface', 'text'],
      ['surface-muted', 'text'],
      ['surface-sunken', 'text'],
      ['border', 'text'],
      ['border-input', 'surface'],
      ['text', 'surface'],
      ['text-muted', 'surface'],
      ['overlay', 'surface'],
    ],
  ],
  [
    'brand',
    [
      ['primary', 'on-primary'],
      ['primary-hover', 'on-primary'],
      ['primary-active', 'on-primary'],
      ['primary-soft', 'on-primary-soft'],
      ['focus', 'surface'],
      ['accent', 'surface'],
      ['accent-soft', 'on-accent-soft'],
    ],
  ],
  [
    'feedback',
    [
      ['success', 'surface'],
      ['success-soft', 'success'],
      ['warning', 'surface'],
      ['warning-soft', 'warning'],
      ['danger', 'on-danger'],
      ['danger-hover', 'on-danger'],
      ['danger-soft', 'danger'],
    ],
  ],
]);

/** [token, sample key, font family key, weight token] */
const TYPE_SCALE = /** @type {const} */ ([
  ['display', 'display', 'serif', 'semibold'],
  ['h1', 'h1', 'serif', 'semibold'],
  ['h2', 'h2', 'serif', 'semibold'],
  ['h3', 'h3', 'serif', 'semibold'],
  ['title-sm', 'titleSm', 'serif', 'semibold'],
  ['body-lg', 'bodyLg', 'sans', 'regular'],
  ['body', 'body', 'sans', 'regular'],
  ['body-sm', 'bodySm', 'sans', 'regular'],
  ['label', 'label', 'sans', 'medium'],
  ['caption', 'caption', 'sans', 'medium'],
]);

const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
const RADIUS_STEPS = ['sm', 'md', 'lg', 'xl', 'full'];
const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'cover'];

/**
 * Current value of a custom property on :root.
 * @param {string} name e.g. '--color-bg'
 */
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Relative luminance of a 6-digit hex colour (WCAG 2.x), or null for other formats.
 * @param {string} value
 * @returns {number | null}
 */
function luminance(value) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((pair) => {
    const channel = parseInt(pair, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two colours, or null when either is not a hex colour.
 * @param {string} a
 * @param {string} b
 * @returns {number | null}
 */
function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  if (first == null || second == null) return null;
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function renderControls() {
  const lang = getLanguage();
  const langButton = qs('#lang-switch');
  const langLabel = t(lang === 'en' ? 'language.switchToHy' : 'language.switchToEn');
  render(
    langButton,
    Icon('languages'),
    h('span', t(lang === 'en' ? 'language.shortEn' : 'language.shortHy')),
  );
  langButton.setAttribute('aria-label', langLabel);
  langButton.title = langLabel;

  const isDark = getTheme() === 'dark';
  const themeButton = qs('#theme-toggle');
  const themeLabel = t(isDark ? 'theme.switchToLight' : 'theme.switchToDark');
  render(themeButton, Icon(isDark ? 'sun' : 'moon'));
  themeButton.setAttribute('aria-label', themeLabel);
  themeButton.title = themeLabel;
}

function renderColors() {
  render(
    qs('#swatches'),
    COLOR_GROUPS.map(([group, pairs]) =>
      h(
        'div',
        { class: 'swatch-group' },
        h('h3', { class: 'swatch-group__title t-label muted' }, t(`design.colors.${group}`)),
        h(
          'div',
          { class: 'swatch-grid' },
          pairs.map(([name, ink]) => {
            const value = token(`--color-${name}`);
            const ratio = contrast(value, token(`--color-${ink}`));
            return h(
              'div',
              { class: 'swatch' },
              h(
                'div',
                {
                  class: 'swatch__chip',
                  style: { '--swatch': `var(--color-${name})`, '--swatch-ink': `var(--color-${ink})` },
                },
                h('span', { class: 'swatch__sample', 'aria-hidden': true }, 'Aa'),
                ratio != null &&
                  h(
                    'span',
                    { class: 't-caption tnum' },
                    t('design.colors.contrast', {
                      ratio: formatNumber(ratio, { maximumFractionDigits: 1 }),
                    }),
                  ),
              ),
              h(
                'div',
                { class: 'swatch__meta' },
                h('code', { class: 't-caption' }, `--color-${name}`),
                h('code', { class: 't-caption muted' }, value.startsWith('#') ? value.toUpperCase() : value),
              ),
            );
          }),
        ),
      ),
    ),
  );
}

function renderTypography() {
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  /** @param {string} rem */
  const px = (rem) => formatNumber(parseFloat(rem) * rootSize);

  render(
    qs('#type-scale'),
    TYPE_SCALE.map(([name, sample, family, weight]) =>
      h(
        'div',
        { class: 'type-row' },
        h(
          'div',
          { class: 'type-row__meta' },
          h('code', { class: 't-label' }, name),
          h(
            'span',
            { class: 't-caption muted tnum' },
            [
              t(`design.typography.${family}`),
              token(`--font-weight-${weight}`),
              `${px(token(`--text-${name}-size`))}/${px(token(`--text-${name}-line`))}`,
            ].join(' · '),
          ),
        ),
        h('p', { class: `type-row__sample t-${name}` }, t(`design.typography.samples.${sample}`)),
      ),
    ),
    h(
      'div',
      { class: 'type-row' },
      h(
        'div',
        { class: 'type-row__meta' },
        h('code', { class: 't-label' }, `${t('language.shortEn')} + ${t('language.shortHy')}`),
      ),
      h(
        'div',
        { class: 'type-row__sample stack gap-2' },
        h('p', { class: 't-h2' }, t('design.typography.mixed')),
        h('p', { class: 't-body tnum' }, t('design.typography.mixed')),
      ),
    ),
  );
}

function renderFoundations() {
  render(
    qs('#spacing-scale'),
    SPACE_STEPS.map((step) =>
      h(
        'div',
        { class: 'scale-row' },
        h('code', { class: 't-caption muted' }, `space-${step}`),
        h('div', { class: 'scale-row__bar', style: { '--bar': `var(--space-${step})` } }),
        h('span', { class: 'scale-row__value t-caption muted tnum' }, token(`--space-${step}`)),
      ),
    ),
  );

  render(
    qs('#radius-scale'),
    RADIUS_STEPS.map((step) =>
      h(
        'div',
        { class: 'radius-box t-caption', style: { '--box-radius': `var(--radius-${step})` } },
        step,
      ),
    ),
  );

  render(
    qs('#shadow-scale'),
    SHADOW_STEPS.map((step) =>
      h(
        'div',
        { class: 'shadow-box t-caption', style: { '--box-shadow': `var(--shadow-${step})` } },
        step,
      ),
    ),
  );
}

function renderIcons() {
  render(
    qs('#icon-grid'),
    ICON_NAMES.map((name) =>
      h('li', { class: 'icon-tile' }, Icon(name), h('code', { class: 't-caption muted' }, name)),
    ),
  );
}

function renderFormatting() {
  const today = todayIso();
  const typed = formatTypedDate(today);
  const rows = [
    ['today', formatDate(today)],
    ['longDate', formatDate(today, 'long')],
    ['range', formatDateRange(today, addDays(today, 13))],
    ['monthHeading', formatDate(today, 'monthYear')],
    ['weekdays', weekdayNames('short').join(' · ')],
    ['typedDate', parseTypedDate(typed) === today ? typed : `${typed} ✗`],
    ['number', formatNumber(diffDays('1970-01-01', today))],
    [
      'plural',
      [1, ICON_NAMES.length].map((count) => t('catalog.resultCount', { count })).join(' · '),
    ],
    ['formatter', t(hasIntlLocale() ? 'design.i18n.intlNative' : 'design.i18n.intlFallback')],
  ];

  render(
    qs('#format-list'),
    rows.map(([key, value]) => [
      h('dt', { class: 't-body-sm' }, t(`design.i18n.${key}`)),
      h('dd', { class: 'tnum' }, value),
    ]),
  );
}

function renderKeyParity() {
  const { total, missingInHy, missingInEn } = diffKeys();
  const ok = missingInHy.length === 0 && missingInEn.length === 0;

  /**
   * @param {string} titleKey
   * @param {string[]} keys
   */
  const missing = (titleKey, keys) =>
    keys.length > 0 && [
      h('p', { class: 't-label' }, t(titleKey)),
      h(
        'ul',
        { class: 'parity__list' },
        keys.map((key) => h('li', h('code', key))),
      ),
    ];

  render(
    qs('#key-parity'),
    ok
      ? h(
          'p',
          { class: 'parity parity--ok' },
          Icon('check'),
          t('design.i18n.keysMatch', { count: total }),
        )
      : h(
          'div',
          { class: 'parity parity--fail', role: 'alert' },
          Icon('circle-alert'),
          h(
            'div',
            { class: 'stack gap-2' },
            missing('design.i18n.missingInHy', missingInHy),
            missing('design.i18n.missingInEn', missingInEn),
          ),
        ),
  );
}

function renderAll() {
  renderControls();
  renderColors();
  renderTypography();
  renderFoundations();
  renderIcons();
  renderFormatting();
  renderKeyParity();
}

async function init() {
  initTheme();
  await initI18n();

  render(qs('#brand-mark'), Icon('book-open', 18));
  renderAll();

  qs('#lang-switch').addEventListener('click', () => {
    setLanguage(getLanguage() === 'en' ? 'hy' : 'en');
  });
  qs('#theme-toggle').addEventListener('click', () => toggleTheme());

  on(EVENTS.LANG_CHANGE, renderAll);
  on(EVENTS.THEME_CHANGE, () => {
    renderControls();
    renderColors();
  });
}

init();
