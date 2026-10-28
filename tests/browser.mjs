import { runPromptFlow } from './prompt-flow.mjs';
await runPromptFlow(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', 'prompt-server');
