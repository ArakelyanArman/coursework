// @ts-check
import { config } from '../../js/config.js';
import { h } from '../../js/core/dom.js';
import { applyTranslations, setText, t, whileConnected } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { LanguageSwitch } from '../LanguageSwitch/LanguageSwitch.js';

const create = await loadTemplate(new URL('./Footer.html', import.meta.url));

/** @returns {HTMLElement} */
export function Footer() {
  const footer = create();
  const parts = refs(footer);

  const source = h('a', { href: config.openLibraryBaseUrl });
  setText(source, { key: 'footer.openLibrary' });

  // The sentence is translated as a whole; the link takes the place of {link}.
  const renderAttribution = () => {
    const [before, after = ''] = t('footer.attribution').split('{link}');
    parts.attribution.replaceChildren(before, source, after);
  };
  renderAttribution();
  whileConnected(footer, renderAttribution);

  setText(parts.copyright, {
    key: 'footer.copyright',
    params: { year: String(new Date().getFullYear()) },
  });
  parts.language.append(LanguageSwitch());
  applyTranslations(footer);
  return footer;
}
