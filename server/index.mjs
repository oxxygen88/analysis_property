import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
const app = express();
app.disable('x-powered-by');
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', mode: 'prompt-generator', requiresApiKey: false }),
);
app.use('/api', (_req, res) =>
  res
    .status(404)
    .json({ error: 'Generator prompt berjalan di browser. Tidak ada endpoint AI yang digunakan.' }),
);
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
app.use((err, _req, res, _next) =>
  res.status(err.status || 500).json({ error: 'Permintaan tidak dapat diproses.' }),
);
const port = Number(process.env.PORT || 3000);
app.listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(`RuangNilai Prompt Studio listening on port ${port}`),
);
