import { AIMessage } from '../src/types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an expert in serverless edge computing, cloud infrastructure, and developer tooling.
You help developers write, debug, and deploy edge functions to Cloudflare Workers, AWS Lambda, Vercel, and Netlify.

When given code, you:
- Spot bugs and security issues immediately
- Suggest runtime-aware optimizations (CPU limits, memory, cold starts)
- Generate production-ready infrastructure configurations
- Explain errors with actionable fix suggestions specific to the edge runtime

Keep responses concise and always include working code examples when relevant.
Format code blocks with the language name (e.g. \`\`\`javascript).`;

export async function askAI(
  messages: AIMessage[],
  currentCode: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('Anthropic API key not set. Add it to the Secrets Vault as "ANTHROPIC_API_KEY".');

  const anthropicMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Prepend current code context if the last message is from the user
  if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === 'user') {
    anthropicMessages[anthropicMessages.length - 1] = {
      role: 'user',
      content: `Current editor code:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\n${anthropicMessages[anthropicMessages.length - 1].content}`,
    };
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(`AI request failed: ${err?.error?.message ?? res.statusText}`);
  }

  const json: any = await res.json();
  return json.content?.[0]?.text ?? 'No response from AI.';
}

export async function generateWorkerFromPrompt(prompt: string, apiKey: string): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `Generate a complete, working Cloudflare Worker script for the following use case. Return ONLY the JavaScript code, no explanation:\n\n${prompt}`,
      timestamp: new Date().toISOString(),
    },
  ];

  const result = await askAI(messages, '', apiKey);
  // Extract code block if present
  const match = result.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
  return match ? match[1].trim() : result.trim();
}

export async function explainError(
  error: string,
  code: string,
  apiKey: string
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `I got this error in my edge function:\n\n${error}\n\nExplain what caused it and give me a specific fix.`,
      timestamp: new Date().toISOString(),
    },
  ];
  return askAI(messages, code, apiKey);
}
