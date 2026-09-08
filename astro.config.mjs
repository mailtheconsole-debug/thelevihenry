import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // 'file' format emits /about.html served at /about — clean URLs that match
  // the current site and the function redirects (/gtm-field-manual, /contact).
  build: { format: 'file' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
