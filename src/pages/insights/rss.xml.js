import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('insights', (p) => !p.data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Levi Henry — Insights',
    description: 'Notes from the work: selling, teaching, building, and making things.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/insights/${p.id}`,
      categories: [p.data.category, ...p.data.tags],
    })),
  });
}
