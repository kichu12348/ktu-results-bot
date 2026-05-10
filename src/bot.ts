import "./utils/writeAbleFetch";
import { Telegraf, Scenes, session } from "telegraf";
import { BOT_TOKEN } from "./config";
import type { BotContext } from "./types/session";
import { scrapeWizard } from "./scenes/scrapeWizard";
import { initQueue, getJobStatus, cancelJob } from "./core/queue";
import { config } from "./fetchDetails/config";
import { loadQueue, saveQueue } from "./utils/saveToDisk";
import store from "./utils/redisClient";

const bot = new Telegraf<BotContext>(BOT_TOKEN);

initQueue(bot);
loadQueue();

const stage = new Scenes.Stage<BotContext>([scrapeWizard]);

bot.use(session({ store }));
bot.use(stage.middleware());

bot.start((ctx) => {
  ctx.reply(
    "👋 <b>Welcome to the KTU Results Bot!</b>\n\n" +
      "I can fetch your academic results seamlessly in the background.\n\n" +
      "<b>Commands:</b>\n" +
      "• /fetch - Start a new request\n" +
      "• /status - Check active request\n" +
      "• /cancel - Abort ongoing request\n\n" +
      "• /github - Get the source code\n" +
      "• /help - Get the help menu\n\n" +
      "<i>Let's get started!</i> 🚀\n\n" +
      "<blockquote><b>⚠️ Warning:</b> Too many requests can temporarily disable your KTU account.\n" +
      `If disabled, try resetting your password on the <a href="${config.BASE_URL}">KTU Portal</a>. This usually resolves the issue.</blockquote>\n\n` +
      '<i>Made with ❤️ by <a href="https://instagram.com/belulu.lulu">Kichu</a></i>\n\n' +
      '☕ <a href="https://buymeacoffee.com/rmahadevane">Buy me a coffee</a>',
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "👋 <b>Welcome to the KTU Results Bot!</b>\n\n" +
      "I can fetch your academic results seamlessly in the background.\n\n" +
      "<b>Commands:</b>\n" +
      "• /fetch - Start a new request\n" +
      "• /status - Check active request\n" +
      "• /cancel - Abort ongoing request\n\n" +
      "• /github - Get the source code\n" +
      "• /help - Get the help menu\n\n" +
      "<blockquote><b>⚠️ Warning:</b> Too many requests can temporarily disable your KTU account.\n" +
      `If disabled, try resetting your password on the <a href="${config.BASE_URL}">KTU Portal</a>. This usually resolves the issue.</blockquote>\n\n` +
      '<i>Made with ❤️ by <a href="https://instagram.com/belulu.lulu">Kichu</a></i>\n\n' +
      '☕ <a href="https://buymeacoffee.com/rmahadevane">Buy me a coffee</a>',
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

bot.command("fetch", (ctx) => ctx.scene.enter("SCRAPE_WIZARD"));

bot.command("status", (ctx) => {
  const userId = ctx.from.id;
  const status = getJobStatus(userId);
  ctx.reply(`ℹ️ Status: *${status}*`, { parse_mode: "Markdown" });
});

bot.command("cancel", (ctx) => {
  const userId = ctx.from.id;
  const cancelled = cancelJob(userId);
  if (cancelled) {
    ctx.reply("✅ Your active job has been cancelled.");
  } else {
    ctx.reply("❌ You do not have any active requests.");
  }
});

bot.command("github", (ctx) => {
  ctx.reply(
    `<b>Source code: </b><a href="https://github.com/kichu12348/ktu-results-bot"><b>GitHub</b></a>`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

bot.catch((err, ctx) => {
  console.error(`Bot Error for ${ctx.updateType}`, err);
});

bot.launch(() => {
  console.log("🤖 Bot is running...");
});

process.on("SIGINT", () => {
  saveQueue();
  process.exit(0);
});

process.on("SIGTERM", () => {
  saveQueue();
  process.exit(0);
});
