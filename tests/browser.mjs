import { runHybridFlow } from './prompt-flow.mjs';
import { runReadinessFlow } from './readiness-flow.mjs';
import { runCostFlow } from './cost-flow.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
await runHybridFlow(base, 'hybrid-server');
await runReadinessFlow(base);
await runCostFlow(base);
