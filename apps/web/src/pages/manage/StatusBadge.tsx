export function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`badge ${published ? 'badge-published' : 'badge-draft'}`}>
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
