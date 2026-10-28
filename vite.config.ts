import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    root: fileURLToPath(new URL('./src', import.meta.url)),
    base: './',
    define: { 'import.meta.env.VITE_STANDALONE': JSON.stringify(String(standalone)) },
    publicDir: standalone ? false : fileURLToPath(new URL('./public', import.meta.url)),
    plugins: [
      react(),
      ...(standalone
        ? [
            {
              name: 'standalone-metadata',
              transformIndexHtml: {
                order: 'pre' as const,
                handler(html: string) {
                  const icon = readFileSync(
                    new URL('./public/favicon.svg', import.meta.url),
                    'utf8',
                  );
                  return {
                    html: html.replace(
                      'href="./favicon.svg"',
                      `href="data:image/svg+xml,${encodeURIComponent(icon)}"`,
                    ),
                    tags: [
                      {
                        tag: 'meta',
                        attrs: { name: 'ruangnilai-build', content: 'standalone' },
                        injectTo: 'head-prepend' as const,
                      },
                    ],
                  };
                },
              },
            },
            viteSingleFile({ removeViteModuleLoader: true }),
          ]
        : []),
    ],
    server: { host: '127.0.0.1' },
    build: standalone
      ? {
          outDir: fileURLToPath(new URL('./.local/standalone', import.meta.url)),
          emptyOutDir: true,
          assetsInlineLimit: Infinity,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : { outDir: fileURLToPath(new URL('./dist', import.meta.url)), emptyOutDir: true },
  };
});
