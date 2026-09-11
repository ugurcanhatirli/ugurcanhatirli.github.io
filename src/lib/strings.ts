// Centralized English interface strings. Not a localization system — the
// site interface stays English; this only keeps chrome text in one place
// instead of scattered across components.

// First-publication year — fixed, must never disappear from the copyright
// line even as later years are added to the range.
const FIRST_PUBLICATION_YEAR = 2026;

export const strings = {
  siteTitle: 'Uğur Can Hatırlı',
  nav: {
    home: 'Home',
    writing: 'Writing',
    notes: 'Notes',
    research: 'Research',
    projects: 'Projects',
    about: 'About',
  },
  // Site-interface apparatus (not article prose): shown only on eligible
  // Writing/Notes detail pages, always in English regardless of the
  // article's own language. See src/pages/writing/[urlSlug].astro and
  // src/pages/notes/[urlSlug].astro.
  fallibility: 'Uğur Can is human. He may be wrong.',
  // <meta name="description"> for the site's static/index pages. Individual
  // Writing/Notes/Research/Project entries use their own frontmatter
  // description instead — these are only for pages with no content entry
  // of their own to draw one from.
  descriptions: {
    home: 'Personal website of Uğur Can Hatırlı, featuring writing and notes on politics, political thought, philosophy, society, language, culture, and technology.',
    writing: 'Essays, fiction, and fragments by Uğur Can Hatırlı.',
    notes: 'Reading and translation notes by Uğur Can Hatırlı.',
    about: 'About Uğur Can Hatırlı, an International Relations student at Galatasaray University.',
    notFound: 'The requested page could not be found.',
  },
  footer: {
    copyright: (currentYear: number) =>
      currentYear <= FIRST_PUBLICATION_YEAR
        ? `© ${FIRST_PUBLICATION_YEAR} Uğur Can Hatırlı`
        : `© ${FIRST_PUBLICATION_YEAR}–${currentYear} Uğur Can Hatırlı`,
    tech: 'Built with Astro · Hosted on GitHub Pages',
  },
} as const;
