import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps ordinary article markup', () => {
    const html = sanitizeHtml(
      '<p>VAT is filed monthly.</p><ul><li>PAYE</li></ul><h2>Deadlines</h2>'
    );
    expect(html).toContain('<p>VAT is filed monthly.</p>');
    expect(html).toContain('<li>PAYE</li>');
    expect(html).toContain('<h2>Deadlines</h2>');
  });

  it('removes script elements and their content', () => {
    const html = sanitizeHtml('<p>Safe</p><script>alert(1)</script>');
    expect(html).toContain('Safe');
    expect(html).not.toContain('script');
    expect(html).not.toContain('alert(1)');
  });

  it('removes event handlers and inline styles', () => {
    const html = sanitizeHtml('<p onclick="steal()" style="color:red">Hello</p>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('style');
    expect(html).toContain('Hello');
  });

  it('rejects javascript addresses', () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('Click');
  });

  it('removes frames, objects and embedded content', () => {
    const html = sanitizeHtml(
      '<iframe src="https://example.com"></iframe><object data="x"></object><embed src="y">'
    );
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('object');
    expect(html).not.toContain('embed');
  });

  it('escapes stray angle brackets in text', () => {
    const html = sanitizeHtml('<p>5 < 10 and 10 > 5</p>');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});
