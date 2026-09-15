import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The /insights blog. Add a post by dropping a Markdown file in
// src/content/insights/ (or via Pages CMS). Category is a free string so a new
// topic can appear without a code change — the filter is built from the data.
const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    description: z.string(), // card summary — written as what the reader walks away with
    date: z.coerce.date(),
    category: z.string().default('Essays'),
    author: z.string().default('Levi Henry'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// Testimonials — video or text. Data-driven so the slider scales to many, and
// new ones can be added gradually (via Pages CMS or a file) without code changes.
const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: z.object({
    type: z.enum(['video', 'text']).default('text'),
    name: z.string(),
    role: z.string().optional(),
    quote: z.string().optional(), // for text testimonials
    video: z.string().optional(), // for video testimonials (path under /assets/video)
    poster: z.string().optional(), // poster image for the video
    avatar: z.string().optional(), // optional image for text cards
    featured: z.boolean().default(false),
    order: z.number().default(100), // lower shows first
    draft: z.boolean().default(false),
  }),
});

export const collections = { insights, testimonials };
