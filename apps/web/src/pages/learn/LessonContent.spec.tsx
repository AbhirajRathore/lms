import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LessonContent } from './LessonContent';
import { makeLesson } from './test-utils';

describe('LessonContent', () => {
  it('renders text bodies as plain text, never as HTML', () => {
    const body = 'Line one\n<script>alert("x")</script>\n<b>not bold</b>';
    const { container } = render(<LessonContent lesson={makeLesson({ id: 'l1', body })} />);

    const text = container.querySelector('.lesson-text');
    expect(text).toHaveTextContent('<script>alert("x")</script>');
    expect(text?.textContent).toBe(body);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('embeds YouTube videos in a sandboxed iframe with notes below', () => {
    const lesson = makeLesson({
      id: 'l1',
      title: 'Watch this',
      type: 'video',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      body: 'Some notes',
    });
    render(<LessonContent lesson={lesson} />);

    const frame = screen.getByTitle('Watch this');
    expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(frame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation allow-popups',
    );
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(frame).toHaveAttribute('allowfullscreen');
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByText('Some notes')).toBeInTheDocument();
  });

  it('plays direct video files in a <video> element', () => {
    const url = 'https://cdn.example.com/intro.mp4';
    const { container } = render(
      <LessonContent lesson={makeLesson({ id: 'l1', type: 'video', url, body: null })} />,
    );

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', url);
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('links to other video pages instead of embedding them', () => {
    const url = 'https://videos.example.com/lesson/1';
    render(<LessonContent lesson={makeLesson({ id: 'l1', type: 'video', url })} />);

    const link = screen.getByRole('link', { name: 'Open video' });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders nothing clickable for a non-https video URL', () => {
    const { container } = render(
      <LessonContent
        lesson={makeLesson({ id: 'l1', type: 'video', url: 'javascript:alert(1)', body: null })}
      />,
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('iframe, video')).toBeNull();
    expect(screen.getByText(/not a valid https URL/)).toBeInTheDocument();
  });

  it('opens documents in a new tab', () => {
    const url = 'https://docs.example.com/handout.pdf';
    render(<LessonContent lesson={makeLesson({ id: 'l1', type: 'document', url })} />);

    const link = screen.getByRole('link', { name: 'Open document' });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not link to a non-https document URL', () => {
    render(
      <LessonContent
        lesson={makeLesson({ id: 'l1', type: 'document', url: 'http://docs.example.com/a.pdf' })}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});
