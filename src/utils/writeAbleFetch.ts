// Bun's native fetch throws errors with readonly .message property.
// Telegraf's redactToken() tries to mutate error.message, which crashes.
// This patch wraps fetch errors in a standard Error with writable .message.

const originalFetch = globalThis.fetch;

globalThis.fetch = async function patchedFetch(
  input: Request | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await originalFetch(input, init);
  } catch (err: any) {
    const writable = new Error(err?.message ?? String(err));
    writable.name = err?.name ?? "FetchError";
    writable.stack = err?.stack;
    if (err?.cause) (writable as any).cause = err.cause;
    throw writable;
  }
} as typeof fetch;
