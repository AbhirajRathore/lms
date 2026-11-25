import { describe, expect, it } from 'vitest';
import { lessonMedia, parseHttpsUrl } from './lessonMedia';

const ID = 'dQw4w9WgXcQ';
const YOUTUBE_EMBED = `https://www.youtube-nocookie.com/embed/${ID}`;

describe('lessonMedia', () => {
  it.each([
    'https://cdn.example.com/videos/intro.mp4',
    'https://cdn.example.com/videos/intro.WEBM',
    'https://cdn.example.com/videos/intro.ogg?token=abc#t=10',
  ])('plays direct video files: %s', (url) => {
    expect(lessonMedia(url)).toEqual({ kind: 'file', src: url });
  });

  it('does not treat a query string ending in .mp4 as a file', () => {
    expect(lessonMedia('https://example.com/watch?file=intro.mp4')).toEqual({
      kind: 'link',
      href: 'https://example.com/watch?file=intro.mp4',
    });
  });

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=xyz`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?start=30`,
  ])('embeds YouTube via youtube-nocookie: %s', (url) => {
    expect(lessonMedia(url)).toEqual({ kind: 'youtube', embedUrl: YOUTUBE_EMBED });
  });

  it.each([
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${ID}x`,
    'https://www.youtube.com/watch?v=dQw4w9WgX%22',
    'https://youtu.be/<script>abc',
    'https://www.youtube.com/watch',
    `https://www.youtube.com/embed/${ID}/extra`,
  ])('falls back to a link for a bad YouTube id: %s', (url) => {
    expect(lessonMedia(url).kind).toBe('link');
  });

  it('does not trust look-alike hosts', () => {
    expect(lessonMedia(`https://evilyoutube.com/watch?v=${ID}`).kind).toBe('link');
    expect(lessonMedia(`https://youtube.com.evil.test/watch?v=${ID}`).kind).toBe('link');
    expect(lessonMedia('https://notvimeo.com/123456').kind).toBe('link');
  });

  it.each([
    'https://vimeo.com/123456789',
    'https://www.vimeo.com/123456789/',
    'https://player.vimeo.com/video/123456789?h=abc',
  ])('embeds Vimeo via the player URL: %s', (url) => {
    expect(lessonMedia(url)).toEqual({
      kind: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
  });

  it('links to other Vimeo pages instead of embedding them', () => {
    expect(lessonMedia('https://vimeo.com/channels/staffpicks').kind).toBe('link');
    expect(lessonMedia('https://player.vimeo.com/video/abc').kind).toBe('link');
  });

  it('links to any other https URL', () => {
    expect(lessonMedia('https://videos.example.com/lesson/42')).toEqual({
      kind: 'link',
      href: 'https://videos.example.com/lesson/42',
    });
  });

  it.each([
    'http://cdn.example.com/intro.mp4',
    `http://www.youtube.com/watch?v=${ID}`,
    'javascript:alert(1)',
    'JavaScript:alert(1)//.mp4',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/intro.mp4',
    '//cdn.example.com/intro.mp4',
    '/videos/intro.mp4',
    'not a url',
    '',
    null,
    undefined,
  ])('rejects anything that is not an absolute https URL: %s', (url) => {
    expect(lessonMedia(url)).toEqual({ kind: 'invalid' });
  });
});

describe('parseHttpsUrl', () => {
  it('accepts https and trims whitespace', () => {
    expect(parseHttpsUrl('  https://example.com/doc.pdf ')?.href).toBe(
      'https://example.com/doc.pdf',
    );
  });

  it('rejects other schemes', () => {
    expect(parseHttpsUrl('http://example.com/doc.pdf')).toBeNull();
    expect(parseHttpsUrl('javascript:alert(1)')).toBeNull();
  });
});
