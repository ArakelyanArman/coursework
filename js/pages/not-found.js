// @ts-check
import { Button } from '../../components/Button/Button.js';
import { Icon } from '../../components/Icon/Icon.js';
import { SearchField } from '../../components/SearchField/SearchField.js';
import { qs, render } from '../core/dom.js';
import { pageUrl } from '../core/paths.js';
import { buildUrl } from '../core/url-state.js';
import { mountShell } from '../shell.js';

await mountShell({ page: 'notFound' });

render(qs('#not-found-mark'), Icon('book-open', 28));

render(
  qs('#not-found-search'),
  SearchField({
    label: { key: 'catalog.searchLabel' },
    placeholder: { key: 'catalog.searchPlaceholder' },
    size: 'lg',
    onSubmit: (query) => window.location.assign(buildUrl('catalog.html', { q: query })),
  }),
);

render(
  qs('#not-found-actions'),
  Button({ label: { key: 'notFound.home' }, href: pageUrl('index.html') }),
  Button({
    label: { key: 'notFound.catalog' },
    variant: 'secondary',
    href: pageUrl('catalog.html'),
  }),
);
