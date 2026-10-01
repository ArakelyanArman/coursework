// @ts-check
import { uid } from '../../js/core/a11y.js';
import { h } from '../../js/core/dom.js';
import { setAttrText, setText, textOf } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Button } from '../Button/Button.js';
import { Checkbox, checkInput } from '../Checkbox/Checkbox.js';
import { Icon } from '../Icon/Icon.js';
import { TextField, inputOf } from '../TextField/TextField.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./FilterAccordion.html', import.meta.url));

// Longer lists start collapsed to this many options and gain a search box.
const VISIBLE_OPTIONS = 8;

/**
 * Several sections may be open at once.
 * @param {{ sections: Element[] }} props
 * @returns {HTMLElement}
 */
export function FilterAccordion({ sections }) {
  return h('div', { class: 'accordion' }, sections);
}

/**
 * One collapsible section.
 * @param {object} props
 * @param {Text} props.label
 * @param {Element} props.content
 * @param {number} [props.count] How many options are selected inside.
 * @param {boolean} [props.open]
 * @returns {HTMLElement}
 */
export function FilterSection({ label, content, count = 0, open = false }) {
  const section = create();
  const { trigger, panel, chevron, label: text } = refs(section);
  const id = uid('accordion');

  trigger.id = `${id}-trigger`;
  trigger.setAttribute('aria-controls', `${id}-panel`);
  panel.id = `${id}-panel`;
  panel.setAttribute('aria-labelledby', trigger.id);
  setText(text, label);
  chevron.append(Icon('chevron-down'));
  panel.append(content);

  const toggle = (/** @type {boolean} */ expanded) => {
    trigger.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
  };
  toggle(open);
  trigger.addEventListener('click', () => toggle(trigger.getAttribute('aria-expanded') !== 'true'));
  setSectionCount(section, count);
  return section;
}

/**
 * @param {Element} section
 * @param {number} count
 */
export function setSectionCount(section, count) {
  const badge = refs(section).count;
  badge.hidden = count === 0;
  badge.textContent = String(count);
  setAttrText(badge, 'aria-label', { key: 'filters.selected', params: { count } });
}

/**
 * A multi-select list of checkboxes.
 * @param {object} props
 * @param {Text} props.label Accessible name of the group.
 * @param {{ value: string, label: Text }[]} props.options
 * @param {string[]} [props.selected]
 * @param {(selected: string[]) => void} [props.onChange]
 * @returns {HTMLFieldSetElement}
 */
export function CheckboxGroup({ label, options, selected = [], onChange }) {
  const chosen = new Set(selected);
  const isLong = options.length > VISIBLE_OPTIONS;
  let expanded = false;
  let query = '';

  const rows = options.map((option) => ({
    option,
    row: Checkbox({
      label: option.label,
      value: option.value,
      checked: chosen.has(option.value),
      onChange: (checked) => {
        if (checked) chosen.add(option.value);
        else chosen.delete(option.value);
        onChange?.(options.map((entry) => entry.value).filter((value) => chosen.has(value)));
      },
    }),
  }));

  const empty = h('p', { class: 'check-group__empty t-body-sm muted', hidden: true });
  setText(empty, { key: 'filters.noMatches' });

  const more = Button({
    label: { key: 'common.showMore' },
    variant: 'link',
    onClick: () => {
      expanded = !expanded;
      refresh();
    },
  });
  more.classList.add('check-group__more');

  const search = TextField({
    label: { key: 'filters.searchList' },
    hideLabel: true,
    type: 'search',
    placeholder: { key: 'filters.searchPlaceholder' },
    icon: 'search',
    onInput: () => {
      query = inputOf(search).value.trim().toLowerCase();
      refresh();
    },
  });
  search.classList.add('check-group__search');

  function refresh() {
    let shown = 0;
    rows.forEach(({ option, row }, index) => {
      const matches = textOf(option.label).toLowerCase().includes(query);
      // A checked option never hides, so the user can always see what is selected.
      const visible = query
        ? matches
        : expanded || index < VISIBLE_OPTIONS || checkInput(row).checked;
      row.hidden = !visible;
      if (visible) shown += 1;
    });
    empty.hidden = shown > 0;
    more.hidden = !isLong || query !== '';
    more.setAttribute('aria-expanded', String(expanded));
    setText(refs(more).label, { key: expanded ? 'common.showLess' : 'common.showMore' });
  }

  const group = h(
    'fieldset',
    { class: 'check-group' },
    h('legend', { class: 'sr-only' }),
    isLong && search,
    rows.map(({ row }) => row),
    empty,
    isLong && more,
  );
  setText(group.querySelector('legend'), label);
  refresh();
  return group;
}
