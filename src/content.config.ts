import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The /insights blog. Add a post by dropping a Markdown file in
// src/content/insights/ with the frontmatter below.
const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default('Levi Henry Group'),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { insights };
