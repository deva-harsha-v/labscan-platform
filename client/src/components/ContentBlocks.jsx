/**
 * Renders structured JSON content blocks. Only a known, safe set of block
 * types is supported (no arbitrary HTML).
 */
export default function ContentBlocks({ blocks }) {
  if (!blocks || blocks.length === 0) {
    return <p className="muted">No content.</p>;
  }
  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={i} className="block-heading">
                {block.text}
              </div>
            );
          case 'text':
            return (
              <p key={i} className="block">
                {block.text}
              </p>
            );
          case 'warning':
            return (
              <div key={i} className="block block-warning">
                ⚠ {block.text}
              </div>
            );
          case 'equation':
            return (
              <div key={i} className="block block-equation">
                {block.latex}
              </div>
            );
          case 'video_link':
            return (
              <p key={i} className="block">
                <a href={block.url} target="_blank" rel="noreferrer">
                  {block.label || block.url}
                </a>
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
