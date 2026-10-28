import { runHybridFlow } from './prompt-flow.mjs';
await runHybridFlow(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', 'hybrid-server');
