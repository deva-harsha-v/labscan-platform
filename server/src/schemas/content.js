import { z } from 'zod';

/**
 * Structured JSON content blocks for theory/procedure text.
 * Keeping a discriminated union means the admin editor and the renderer
 * agree on a small, safe set of block types (no arbitrary HTML).
 */
export const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().min(1).max(500) }),
  z.object({ type: z.literal('text'), text: z.string().min(1).max(10000) }),
  z.object({ type: z.literal('warning'), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('equation'), latex: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal('video_link'),
    url: z.string().url().max(2048),
    label: z.string().max(200).optional(),
  }),
]);

export const theoryProcedureSchema = z.array(contentBlockSchema).max(500);

/**
 * Video links drive the Visual stage timers.
 * - faculty  -> 300s minimum (stored object, served via signed URL)
 * - youtube  -> 60s minimum
 * - virtual  -> 60s minimum (external virtual-lab link)
 */
const facultyVideoSchema = z.object({
  video_id: z.string().min(1).max(64),
  type: z.literal('faculty'),
  storage_key: z.string().min(1).max(1024),
  title: z.string().max(255).optional(),
  min_duration: z.number().int().positive().default(300),
});

const youtubeVideoSchema = z.object({
  video_id: z.string().min(1).max(64),
  type: z.literal('youtube'),
  url: z.string().url().max(2048),
  title: z.string().max(255).optional(),
  min_duration: z.number().int().positive().default(60),
});

const virtualVideoSchema = z.object({
  video_id: z.string().min(1).max(64),
  type: z.literal('virtual'),
  url: z.string().url().max(2048),
  title: z.string().max(255).optional(),
  min_duration: z.number().int().positive().default(60),
});

export const videoLinkSchema = z.discriminatedUnion('type', [
  facultyVideoSchema,
  youtubeVideoSchema,
  virtualVideoSchema,
]);

export const videoLinksSchema = z.array(videoLinkSchema).max(50);

export const DEFAULT_MIN_DURATION = Object.freeze({
  faculty: 300,
  youtube: 60,
  virtual: 60,
});
