import OpenAI, { type ClientOptions } from "openai";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";

let openaiClient: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

let openRouterClient: OpenAI | null = null;

/**
 * The OpenAI SDK's default Node fetch is `node-fetch` paired with an
 * `agentkeepalive` HTTP(S) agent that keeps sockets open for 5 minutes. On a
 * lightly-trafficked route like this one, requests are minutes apart, so the
 * client routinely tries to reuse a socket OpenRouter's edge has already
 * torn down — surfacing as an intermittent `Invalid response body ...
 * Premature close` rather than a clean connection-refused error. A
 * dedicated undici dispatcher with a short keep-alive timeout means a socket
 * is never offered for reuse long after it could plausibly still be alive,
 * so a stale one is never picked back up.
 */
const openRouterDispatcher = new UndiciAgent({
  keepAliveTimeout: 4_000,
  keepAliveMaxTimeout: 4_000,
});

const openRouterFetch: ClientOptions["fetch"] = (url, init) =>
  undiciFetch(url as Parameters<typeof undiciFetch>[0], {
    ...(init as Record<string, unknown>),
    dispatcher: openRouterDispatcher,
  }) as unknown as Promise<Response>;

/**
 * OpenRouter speaks the OpenAI chat-completions wire format, so the same SDK
 * works against it with just a different base URL and key — no separate
 * client library. Kept apart from getAIClient() so features that want a
 * specific (often free) OpenRouter model never depend on OPENAI_API_KEY.
 */
export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    openRouterClient = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      fetch: openRouterFetch,
      defaultHeaders: {
        // Optional attribution headers OpenRouter uses for its public
        // rankings — harmless to omit, so only sent when known.
        ...(process.env.APP_BASE_URL
          ? { "HTTP-Referer": process.env.APP_BASE_URL }
          : {}),
        "X-Title": "Onramp Hiring Platform",
      },
    });
  }
  return openRouterClient;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>,
): Promise<string> {
  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: options?.model ?? "gpt-4o-mini",
    messages,
    ...options,
  });
  return response.choices[0]?.message?.content ?? "";
}
