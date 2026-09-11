import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publishedOnly } from '../lib/content';

// Zero-dependency sitemap: lists only genuinely public URLs. Research and
// Projects are intentionally excluded below — they are not public in v1.
//
// When Research or Projects are later made public (unlinked _index.astro
// files renamed back to index.astro — see src/pages/research/,
// src/pages/projects/), add their static index paths to `staticPaths` and
// their published entries to `urls` here, the same way `writingPaths` is
// built below. Easy to forget since this file doesn't error or warn if a
// newly-public section is left out.
export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const staticPaths = ['/', '/writing/', '/notes/', '/about/'];
  const writingEntries = publishedOnly(await getCollection('writing'));
  const writingPaths = writingEntries.map((entry) => `/writing/${entry.data.urlSlug}/`);
  const noteEntries = publishedOnly(await getCollection('notes'));
  const notePaths = noteEntries.map((entry) => `/notes/${entry.data.urlSlug}/`);

  const urls = [...staticPaths, ...writingPaths, ...notePaths];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${base}${path}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
