/**
 * Decides how a lesson's media URL is shown. Only https URLs are accepted, and embeds are built
 * from a validated video id, so a stored URL never reaches an iframe src as-is.
 */
export type LessonMedia =
  | { kind: 'file'; src: string }
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'link'; href: string }
  | { kind: 'invalid' };

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.ogg'];
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  // YouTube's own "privacy-enhanced" embed code uses these hosts.
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The URL when it is an absolute https URL, otherwise null. */
export function parseHttpsUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  let candidate: string | null | undefined = null;
  if (YOUTUBE_SHORT_HOSTS.has(url.hostname)) {
    candidate = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    candidate =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  }
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

function vimeoId(url: URL): string | null {
  if (!VIMEO_HOSTS.has(url.hostname)) return null;
  const pattern = url.hostname === 'player.vimeo.com' ? /^\/video\/(\d+)\/?$/ : /^\/(\d+)\/?$/;
  return pattern.exec(url.pathname)?.[1] ?? null;
}

export function lessonMedia(raw: string | null | undefined): LessonMedia {
  const url = parseHttpsUrl(raw);
  if (!url) return { kind: 'invalid' };

  const path = url.pathname.toLowerCase();
  if (VIDEO_FILE_EXTENSIONS.some((ext) => path.endsWith(ext))) {
    return { kind: 'file', src: url.href };
  }

  const youtube = youtubeId(url);
  if (youtube) {
    return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}` };
  }

  const vimeo = vimeoId(url);
  if (vimeo) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo}` };

  return { kind: 'link', href: url.href };
}
