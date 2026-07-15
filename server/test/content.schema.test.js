import { describe, it, expect } from 'vitest';
import { theoryProcedureSchema, videoLinksSchema } from '../src/schemas/content.js';

describe('theoryProcedureSchema', () => {
  it('accepts a valid block array', () => {
    const blocks = [
      { type: 'heading', text: 'Aim' },
      { type: 'text', text: 'Determine g.' },
      { type: 'warning', text: 'Small angles only.' },
      { type: 'equation', latex: 'T = 2\\pi\\sqrt{L/g}' },
    ];
    const result = theoryProcedureSchema.safeParse(blocks);
    expect(result.success).toBe(true);
  });

  it('rejects unknown block types', () => {
    const result = theoryProcedureSchema.safeParse([{ type: 'iframe', src: 'x' }]);
    expect(result.success).toBe(false);
  });

  it('rejects empty heading text', () => {
    const result = theoryProcedureSchema.safeParse([{ type: 'heading', text: '' }]);
    expect(result.success).toBe(false);
  });
});

describe('videoLinksSchema', () => {
  it('defaults faculty min_duration to 300s', () => {
    const result = videoLinksSchema.safeParse([
      { video_id: 'v1', type: 'faculty', storage_key: 'faculty-videos/x.mp4' },
    ]);
    expect(result.success).toBe(true);
    expect(result.data[0].min_duration).toBe(300);
  });

  it('defaults youtube min_duration to 60s', () => {
    const result = videoLinksSchema.safeParse([
      { video_id: 'v2', type: 'youtube', url: 'https://youtu.be/abc' },
    ]);
    expect(result.success).toBe(true);
    expect(result.data[0].min_duration).toBe(60);
  });

  it('rejects youtube without a url', () => {
    const result = videoLinksSchema.safeParse([{ video_id: 'v3', type: 'youtube' }]);
    expect(result.success).toBe(false);
  });
});
