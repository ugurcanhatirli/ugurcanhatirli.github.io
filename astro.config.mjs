// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Repository name matches the special <username>.github.io pattern, so
  // this deploys at the domain root — no `base` needed.
  site: 'https://ugurcanhatirli.github.io',
});
