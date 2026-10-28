import { copyFile } from 'node:fs/promises';
// The root HTML is deliberately versioned: GitHub Pages can serve main/root without a Node build.
await copyFile(
  new URL('../.local/standalone/index.html', import.meta.url),
  new URL('../index.html', import.meta.url),
);
console.log('index.html siap dibuka langsung atau ditayangkan di GitHub Pages.');
