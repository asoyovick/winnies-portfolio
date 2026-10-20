/**
 * Minimal HTML sanitiser for administrator-authored article bodies.
 *
 * Articles are written by a trusted administrator, but they are still rendered
 * with dangerouslySetInnerHTML, so anything that can execute in a visitor's
 * browser is removed before the markup is served.
 */

const BLOCKED_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
];

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'img',
  'span',
  'div',
  'hr',
]);

const ALLOWED_ATTRIBUTES = new Set([
  'href',
  'src',
  'alt',
  'title',
  'colspan',
  'rowspan',
]);

const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const COMMENTS = /<!--[\s\S]*?-->/g;
const DOCTYPE = /<!DOCTYPE[^>]*>/gi;

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanAttributes(raw: string): string {
  const allowed: string[] = [];
  let match: RegExpExecArray | null;

  ATTR_PATTERN.lastIndex = 0;
  while ((match = ATTR_PATTERN.exec(raw)) !== null) {
    const name = (match[1] ?? '').toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    if (name.startsWith('on')) continue;
    if (name === 'style') continue;
    if (!ALLOWED_ATTRIBUTES.has(name)) continue;

    if (name === 'src') {
      if (!/^\s*(https?:|\/)/i.test(value)) continue;
    }
    if (name === 'href') {
      if (!/^\s*(https?:|\/|#|mailto:|tel:)/i.test(value)) continue;
    }

    if (name === 'target') {
      allowed.push('target="_blank"');
      allowed.push('rel="noopener noreferrer"');
      continue;
    }

    allowed.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
  }

  return allowed.length > 0 ? ` ${allowed.join(' ')}` : '';
}

function sanitizeTag(full: string, closing: string, tagName: string, attrs: string): string {
  const tag = tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return '';
  if (closing) return `</${tag}>`;
  return `<${tag}${cleanAttributes(attrs)}>`;
}

export function sanitizeHtml(input: string): string {
  if (!input) return '';

  let html = input.replace(COMMENTS, '').replace(DOCTYPE, '');

  // Remove blocked elements together with their content.
  for (const tag of BLOCKED_TAGS) {
    html = html.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'),
      ''
    );
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  const out: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TAG_PATTERN.lastIndex = 0;
  while ((match = TAG_PATTERN.exec(html)) !== null) {
    out.push(escapeText(html.slice(lastIndex, match.index)));
    out.push(sanitizeTag(match[0], match[1] ?? '', match[2] ?? '', match[3] ?? ''));
    lastIndex = match.index + match[0].length;
  }
  out.push(escapeText(html.slice(lastIndex)));

  return out.join('');
}
