import { useId } from 'react';
import type { Lesson } from '@lms/shared';
import { lessonMedia, parseHttpsUrl } from './lessonMedia';

/** Third-party players need scripts and their own origin; nothing else is granted. */
const EMBED_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';

function VideoMedia({ lesson }: { lesson: Lesson }) {
  const media = lessonMedia(lesson.url);
  switch (media.kind) {
    case 'youtube':
    case 'vimeo':
      return (
        <div className="lesson-embed">
          <iframe
            src={media.embedUrl}
            title={lesson.title}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={EMBED_SANDBOX}
          />
        </div>
      );
    case 'file':
      return (
        <video className="lesson-video" src={media.src} controls preload="metadata">
          Your browser can’t play this video.
        </video>
      );
    case 'link':
      return (
        <p>
          <a
            className="btn btn-primary"
            href={media.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open video
          </a>
        </p>
      );
    case 'invalid':
      return <p className="muted">This video’s link is missing or not a valid https URL.</p>;
  }
}

function DocumentLink({ url }: { url: string | null }) {
  const href = parseHttpsUrl(url)?.href;
  if (!href) {
    return <p className="muted">This document’s link is missing or not a valid https URL.</p>;
  }
  return (
    <p>
      <a className="btn btn-primary" href={href} target="_blank" rel="noopener noreferrer">
        Open document
      </a>
    </p>
  );
}

/** Renders a lesson's body and media. Text is always rendered as plain text (never as HTML). */
export function LessonContent({ lesson }: { lesson: Lesson }) {
  const notesHeadingId = useId();

  if (lesson.type === 'text') {
    return <div className="lesson-text">{lesson.body}</div>;
  }

  return (
    <div className="stack">
      {lesson.type === 'video' ? <VideoMedia lesson={lesson} /> : <DocumentLink url={lesson.url} />}
      {lesson.body && (
        <section className="lesson-notes" aria-labelledby={notesHeadingId}>
          <h2 id={notesHeadingId}>Notes</h2>
          <div className="lesson-text">{lesson.body}</div>
        </section>
      )}
    </div>
  );
}
