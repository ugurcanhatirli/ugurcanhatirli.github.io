// Single source of truth for the subject taxonomy shared by Writing and Research.
// Ids are stable and referenced from content frontmatter; labels may be reworded freely.

export const SUBJECT_IDS = ['politics-ir', 'political-thought', 'philosophy', 'society'] as const;

export type SubjectId = (typeof SUBJECT_IDS)[number];

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  'politics-ir': 'Politics & International Relations',
  'political-thought': 'Political Thought',
  philosophy: 'Philosophy',
  society: 'Society',
};
