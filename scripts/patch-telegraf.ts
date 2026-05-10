/**
 * Patches Telegraf's redactToken function to handle Bun's
 * readonly error.message property.
 *
 * Run automatically via `postinstall` script.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const clientPath = join(
  import.meta.dirname,
  "..",
  "node_modules",
  "telegraf",
  "lib",
  "core",
  "network",
  "client.js",
);

const original = `function redactToken(error) {
    error.message = error.message.replace(/\\/(bot|user)(\\d+):[^/]+\\//, '/$1$2:[REDACTED]/');
    throw error;
}`;

const patched = `function redactToken(error) {
    const redacted = (error.message || '').replace(/\\/(bot|user)(\\d+):[^/]+\\//, '/$1$2:[REDACTED]/');
    try {
        error.message = redacted;
    } catch (_) {
        const wrapped = new Error(redacted);
        wrapped.name = error.name;
        wrapped.stack = error.stack;
        if (error.cause) wrapped.cause = error.cause;
        throw wrapped;
    }
    throw error;
}`;

const content = readFileSync(clientPath, "utf-8");

if (content.includes(original)) {
  writeFileSync(clientPath, content.replace(original, patched), "utf-8");
  console.log("✅ Patched telegraf redactToken for Bun compatibility");
} else if (content.includes("const redacted =")) {
  console.log("ℹ️  telegraf redactToken already patched");
} else {
  console.warn(
    "⚠️  Could not find redactToken in telegraf — patch may need updating",
  );
}
