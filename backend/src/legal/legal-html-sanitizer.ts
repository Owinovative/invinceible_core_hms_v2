import sanitizeHtml from 'sanitize-html';

const LEGAL_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'blockquote',
    'a',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...(attribs.href ? { href: attribs.href } : {}),
        ...(attribs.title ? { title: attribs.title } : {}),
        rel: 'noopener noreferrer',
      },
    }),
  },
};

export function sanitizeLegalHtml(content: string): string {
  return sanitizeHtml(content, LEGAL_HTML_OPTIONS).trim();
}
