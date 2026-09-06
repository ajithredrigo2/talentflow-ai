/**
 * Model access layer.
 *
 * All model calls happen server-side only. Keys come from environment
 * variables and are never exposed to the browser. When no key is configured the
 * platform falls back to its deterministic reasoning engine, so the prototype
 * always demonstrates a complete, working agent workflow.
 */

export type Engine = 'llm' | 'deterministic';

export function aiConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'deterministic') return false;
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY) || Boolean(process.env.OPENAI_API_KEY);
}

export function activeProvider(): 'gemini' | 'openai' | 'deterministic' {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'deterministic') return 'deterministic';
  if (provider === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'deterministic';
}

const SYSTEM_GUARDRAIL = `You are an agent inside TalentFlow AI, an enterprise HR automation platform.
Rules you must never break:
- You never make a final employment decision. You produce recommendations for a named human approver.
- You never use or infer gender, race, ethnicity, religion, nationality, disability, marital status, or age as a factor in any assessment.
- Every recommendation must be explainable: state the evidence you used.
- If you lack grounding data, say so rather than inventing facts about a person.
Write in concise, professional British-English HR language. No emoji.`;

interface LLMOptions {
  prompt: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

async function callGemini(opts: LLMOptions): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_GUARDRAIL }] },
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens ?? 1200,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

async function callOpenAI(opts: LLMOptions): Promise<string> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1200,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: SYSTEM_GUARDRAIL },
        { role: 'user', content: opts.prompt },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Returns model text, or null when no provider is configured or the call fails. */
export async function llm(opts: LLMOptions): Promise<string | null> {
  const provider = activeProvider();
  if (provider === 'deterministic') return null;
  try {
    const text = provider === 'openai' ? await callOpenAI(opts) : await callGemini(opts);
    return text?.trim() ? text.trim() : null;
  } catch (err) {
    console.error('[ai] model call failed, falling back to deterministic engine:', (err as Error).message);
    return null;
  }
}

/** Model JSON call with schema-shaped fallback. */
export async function llmJson<T>(prompt: string, fallback: T, maxTokens = 1200): Promise<{ value: T; engine: Engine }> {
  const raw = await llm({ prompt, json: true, maxTokens });
  if (!raw) return { value: fallback, engine: 'deterministic' };
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return { value: JSON.parse(cleaned) as T, engine: 'llm' };
  } catch {
    return { value: fallback, engine: 'deterministic' };
  }
}

/** Model prose call with deterministic fallback text. */
export async function llmText(prompt: string, fallback: string, maxTokens = 700): Promise<{ value: string; engine: Engine }> {
  const raw = await llm({ prompt, maxTokens });
  return raw ? { value: raw, engine: 'llm' } : { value: fallback, engine: 'deterministic' };
}
