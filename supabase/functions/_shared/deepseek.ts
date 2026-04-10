const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';

interface DeepSeekJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  maxAttempts?: number;
  requestLabel: string;
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function callDeepSeekJson({
  systemPrompt,
  userPrompt,
  maxTokens,
  maxAttempts = 3,
  requestLabel,
}: DeepSeekJsonRequest): Promise<unknown> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY secret');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${bodyText}`);
      }

      const data = await response.json() as DeepSeekChatResponse;
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent || !rawContent.trim()) {
        throw new Error('DeepSeek returned empty content');
      }

      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[${requestLabel}] attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error('DeepSeek request failed after retries');
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
