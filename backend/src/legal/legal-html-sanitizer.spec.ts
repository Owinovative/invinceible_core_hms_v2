import { sanitizeLegalHtml } from './legal-html-sanitizer';

describe('sanitizeLegalHtml', () => {
  it('removes executable tags and event handlers', () => {
    const result = sanitizeLegalHtml(
      '<p onclick="steal()">Terms</p><img src=x onerror="steal()"><script>steal()</script>',
    );

    expect(result).toBe('<p>Terms</p>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<script');
  });

  it('removes script URLs while retaining safe legal formatting', () => {
    const result = sanitizeLegalHtml(
      '<h2>Privacy</h2><p><strong>Read this.</strong> <a href="javascript:steal()" target="_blank">bad</a> <a href="https://example.org/policy">policy</a></p>',
    );

    expect(result).toContain('<h2>Privacy</h2>');
    expect(result).toContain('<strong>Read this.</strong>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('target=');
    expect(result).toContain('href="https://example.org/policy"');
    expect(result).toContain('rel="noopener noreferrer"');
  });
});
