import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { SUBJECT_IDS } from './lib/subjects';

// A published URL must be exactly one lowercase kebab-case segment:
// no slashes, no uppercase, no leading/trailing or doubled hyphens.
const URL_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const urlSlugField = z
  .string()
  .regex(
    URL_SLUG_PATTERN,
    'urlSlug must be a single lowercase kebab-case segment (letters, digits, single hyphens; no "/")',
  )
  .optional();

const draftField = z.boolean().default(false);

// urlSlug is optional while an entry is a draft, but required the moment
// it is published — this is the deterministic "can't ship without a
// permanent URL" gate the architecture requires.
function requireUrlSlugWhenPublished(
  data: { draft: boolean; urlSlug?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.draft && !data.urlSlug) {
    ctx.addIssue({
      code: 'custom',
      message: 'urlSlug is required once an entry is published (draft: false)',
      path: ['urlSlug'],
    });
  }
}

// A data-entry guard, not a feature: catches an updatedDate accidentally
// set earlier than pubDate. Same defensive pattern as urlSlug's own check.
function updatedDateNotBeforePubDate(
  data: { pubDate: Date; updatedDate?: Date },
  ctx: z.RefinementCtx,
) {
  if (data.updatedDate && data.updatedDate < data.pubDate) {
    ctx.addIssue({
      code: 'custom',
      message: 'updatedDate cannot be earlier than pubDate',
      path: ['updatedDate'],
    });
  }
}

const lang = z.enum(['en', 'fr', 'tr']);
const subjects = z.array(z.enum(SUBJECT_IDS));

// Provenance date for a work's own writing/completion, distinct from
// pubDate (first publication on this site). Accepts exactly "YYYY-MM" or
// "YYYY-MM-DD" — a month-only value is never widened to a specific day.
//
// Must be QUOTED in frontmatter, e.g. writtenDate: "2026-04-26". An
// unquoted YYYY-MM-DD scalar gets auto-parsed into a Date by the content
// loader's own YAML handling before this schema ever runs — and, verified
// empirically, that parser silently rolls over impossible dates instead of
// rejecting them (2026-02-31 becomes 2026-03-03) with no way to recover
// the original invalid string afterward. Rather than trust a coercion that
// can already have silently corrupted the value, unquoted input is
// rejected outright below.
const WRITTEN_DATE_PATTERN = /^\d{4}-\d{2}(-\d{2})?$/;

function isRealCalendarDate(value: string): boolean {
  const parts = value.split('-').map(Number);
  const [year, month, day] = parts;
  if (month < 1 || month > 12) return false;
  if (parts.length === 2) return true;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const writtenDateField = z.preprocess((value) => {
  // A Date here means the frontmatter value was left unquoted — reject it
  // rather than reconstruct a string from it, since that Date may already
  // be a silently rolled-over version of an invalid date the author wrote.
  if (value instanceof Date) return 'UNQUOTED_WRITTEN_DATE';
  return value;
}, z
  .string()
  .regex(
    WRITTEN_DATE_PATTERN,
    'writtenDate must be exactly "YYYY-MM" or "YYYY-MM-DD", quoted as a string in frontmatter (e.g. writtenDate: "2026-04-26") — an unquoted value is silently misparsed',
  )
  .refine(isRealCalendarDate, 'writtenDate must be a real calendar date')
  .optional());

// writtenDate may not fall after pubDate — a work can't be published
// before it was written. A month-only writtenDate is compared at month
// precision, never widened to an invented day.
function writtenDateNotAfterPubDate(
  data: { pubDate: Date; writtenDate?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.writtenDate) return;
  const [yearStr, monthStr, dayStr] = data.writtenDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const pubYear = data.pubDate.getUTCFullYear();
  const pubMonth = data.pubDate.getUTCMonth() + 1;
  const pubDay = data.pubDate.getUTCDate();

  const isAfter = dayStr
    ? Date.UTC(year, month - 1, Number(dayStr)) > Date.UTC(pubYear, pubMonth - 1, pubDay)
    : year > pubYear || (year === pubYear && month > pubMonth);

  if (isAfter) {
    ctx.addIssue({
      code: 'custom',
      message: 'writtenDate cannot be after pubDate',
      path: ['writtenDate'],
    });
  }
}

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      lang,
      subjects,
      // Distinguishes a full essay from other short-form kinds (a single
      // aphorism, a short story). 'essay' is the default so all prior
      // entries validate unchanged; only a non-default kind is ever shown
      // in the UI, via the same titleCase() helper used for Research/Projects.
      kind: z.enum(['essay', 'fragment', 'fiction']).default('essay'),
      urlSlug: urlSlugField,
      draft: draftField,
    })
    .superRefine(requireUrlSlugWhenPublished)
    .superRefine(updatedDateNotBeforePubDate),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z
    .object({
      title: z.string(),
      abstract: z.string(),
      kind: z.enum(['note', 'analysis', 'working-paper', 'paper']),
      authors: z.array(z.string()).optional(),
      venue: z.string().optional(),
      doi: z.string().optional(),
      // A path under public/documents/, e.g. "/documents/my-paper.pdf" —
      // never an astro:assets image reference. See lib/content.ts note.
      pdf: z.string().optional(),
      lang,
      subjects,
      urlSlug: urlSlugField,
      draft: draftField,
    })
    .superRefine(requireUrlSlugWhenPublished),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z
    .object({
      title: z.string(),
      summary: z.string(),
      role: z.string().optional(),
      period: z.union([
        z.object({ start: z.coerce.date(), end: z.coerce.date().optional() }),
        z.literal('ongoing'),
      ]),
      links: z.array(z.object({ label: z.string(), url: z.url() })),
      status: z.enum(['active', 'archived']),
      urlSlug: urlSlugField,
      draft: draftField,
    })
    .superRefine(requireUrlSlugWhenPublished),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      writtenDate: writtenDateField,
      lang,
      subjects,
      noteType: z.enum(['reading', 'translation']),
      urlSlug: urlSlugField,
      draft: draftField,
    })
    .superRefine(requireUrlSlugWhenPublished)
    .superRefine(updatedDateNotBeforePubDate)
    .superRefine(writtenDateNotAfterPubDate),
});

export const collections = { writing, research, projects, notes };
