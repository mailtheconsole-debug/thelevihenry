import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Canonical production origin — powers canonical URLs and the sitemap.
  site: 'https://thelevihenry.com',
  // 'file' format emits /about.html served at /about — clean URLs that match
  // the current site and the function redirects (/gtm-field-manual, /contact).
  build: { format: 'file' },
  integrations: [
    react(),
    sitemap({
      // Keep the gated/utility pages out of the sitemap.
      filter: (page) =>
        !['/gtm-field-manual', '/book-discovery', '/ebook-thanks', '/email-signature'].some((p) =>
          page.replace(/\/$/, '').endsWith(p)
        ),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
