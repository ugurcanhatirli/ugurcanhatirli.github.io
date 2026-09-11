// Shared helpers used identically by writing/research/projects routing.
// Kept small and explicit rather than a generic content-framework abstraction.

interface DraftEntry {
  data: { draft: boolean };
}

interface SlugEntry {
  id: string;
  data: { urlSlug?: string };
}

/** Drafts never generate a public route or appear in a public listing. */
export function publishedOnly<T extends DraftEntry>(entries: T[]): T[] {
  return entries.filter((entry) => !entry.data.draft);
}

/**
 * Fails the build deterministically if two publishable entries in the same
 * collection request the same urlSlug. Keyed on the schema-owned urlSlug
 * field only — never on Astro's internal entry id.
 */
export function assertUniqueUrlSlugs(collectionName: string, entries: SlugEntry[]): void {
  const seenBy = new Map<string, string>();
  for (const entry of entries) {
    const slug = entry.data.urlSlug;
    if (!slug) continue;
    const existingId = seenBy.get(slug);
    if (existingId) {
      throw new Error(
        `Duplicate urlSlug "${slug}" in collection "${collectionName}": ` +
          `used by both "${existingId}" and "${entry.id}". ` +
          'Each published entry must have a unique urlSlug.',
      );
    }
    seenBy.set(slug, entry.id);
  }
}

/**
 * Formats a hyphenated enum value (e.g. "working-paper") as restrained title
 * case ("Working Paper") for display. Avoids all-caps metadata, which reads
 * as database/journal formatting rather than editorial text.
 */
export function titleCase(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a calendar date (pubDate/updatedDate) in the entry's own locale.
 * Pinned to timeZone: 'UTC' deliberately: pubDate/updatedDate are stored as
 * plain calendar dates (e.g. "2026-09-11") and parsed at UTC midnight. Without
 * an explicit UTC pin, toLocaleDateString falls back to the host machine's
 * local timezone — harmless when that happens to be at or ahead of UTC (as
 * both this project's dev machine and GitHub Actions' UTC runners are), but a
 * silent one-day-back shift on any host behind UTC (verified: the same date
 * renders a day earlier under America/Los_Angeles). Pinning UTC here makes
 * the displayed date independent of wherever the build actually runs.
 */
export function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Formats a provenance writtenDate ("YYYY-MM" or "YYYY-MM-DD") using the
 * entry's own locale. A month-only value renders without a day — it is
 * never widened to an invented one. Also pinned to timeZone: 'UTC' — see
 * formatDate above for why.
 */
export function formatWrittenDate(writtenDate: string, lang: string): string {
  const [year, month, day] = writtenDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', timeZone: 'UTC' };
  if (day) options.day = 'numeric';
  return date.toLocaleDateString(lang, options);
}

/**
 * Deterministic listing order: newest pubDate first, ties broken by urlSlug
 * ascending. Plain "<"/">" on kebab-case ASCII slugs is a simple ordinal
 * comparison — no locale-dependent collation, so it can't vary by platform.
 * Without this secondary key, entries sharing a pubDate fall back to
 * whatever order the content loader happened to enumerate files in, which is
 * not something the code specifies or guarantees.
 */
export function compareByPubDateDesc<T extends { data: { pubDate: Date; urlSlug?: string } }>(
  a: T,
  b: T,
): number {
  const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  if (dateDiff !== 0) return dateDiff;
  const slugA = a.data.urlSlug ?? '';
  const slugB = b.data.urlSlug ?? '';
  if (slugA < slugB) return -1;
  if (slugA > slugB) return 1;
  return 0;
}

/**
 * Home's "Selected Writing" — an intentional editorial selection, not the
 * newest N entries. Ordered; this order is the display order. A plain slug
 * list (rather than a per-file `featured` flag or `featuredOrder` number) is
 * the smallest representation of "a curated, ordered set of exactly these
 * pieces" — the whole selection is visible and reorderable in one place,
 * with no per-content-file bookkeeping to keep in sync.
 */
export const SELECTED_WRITING_SLUGS = [
  'the-weight-of-a-conjunction',
  'the-monopoly-on-reason',
  'tanrilardan-cok-aileden-korkmak',
  'la-fete-des-meres-ou-comment-un-sentiment-devient-une-norme',
  'yakinlik-derecesi',
] as const;

/**
 * Resolves SELECTED_WRITING_SLUGS against the actual published Writing
 * entries, in the configured order. Throws — rather than silently omitting —
 * if a configured slug no longer resolves to a published entry (e.g. it was
 * unpublished, renamed, or typo'd), so a stale selection fails the build
 * instead of quietly showing fewer than five pieces.
 */
export function resolveSelectedWriting<T extends { data: { urlSlug?: string } }>(
  publishedEntries: T[],
): T[] {
  const byUrlSlug = new Map(publishedEntries.map((entry) => [entry.data.urlSlug, entry]));
  return SELECTED_WRITING_SLUGS.map((slug) => {
    const entry = byUrlSlug.get(slug);
    if (!entry) {
      throw new Error(
        `SELECTED_WRITING_SLUGS references "${slug}", which does not resolve to a published ` +
          'Writing entry. Update the selection in lib/content.ts or restore/publish that entry.',
      );
    }
    return entry;
  });
}

/**
 * Explicit public-section gates. Research and Projects are fully implemented
 * (schema, routes, listing) but intentionally not public yet. Each detail
 * route's getStaticPaths checks its gate FIRST and returns no paths at all
 * when false — independent of whether the collection actually has entries —
 * so adding a content file to src/content/research/ or src/content/projects/
 * ahead of an intentional launch can never silently publish a detail page.
 * Flipping a gate to true is necessary but not sufficient to go public: the
 * matching _index.astro must also be renamed back to index.astro and the
 * section added to Nav.astro.
 */
export const RESEARCH_PUBLIC = false;
export const PROJECTS_PUBLIC = false;
