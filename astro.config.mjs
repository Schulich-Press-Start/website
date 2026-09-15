import { defineConfig } from 'astro/config';
import { localReviewPlugin } from './scripts/local-review.mjs';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: {
    plugins: process.env.SPS_REVIEW === '1' ? [localReviewPlugin()] : [],
    build: { assetsInlineLimit: 0 },
  },
});