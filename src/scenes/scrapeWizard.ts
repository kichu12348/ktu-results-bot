import { Scenes, Markup } from "telegraf";
import type { BotContext } from "../types/session";
import { checkRateLimit } from "../utils/rateLimit";
import { addJobToQueue } from "../core/queue";
import type { Semester } from "../fetchDetails/functions";

export const scrapeWizard = new Scenes.WizardScene<BotContext>(
  "SCRAPE_WIZARD",
  async (ctx) => {
    await ctx.reply(
      "📝 Let's fetch your KTU results.\n\nPlease enter your *KTU Username* (e.g. TVA19CS012):",
      { parse_mode: "Markdown" },
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;
    ctx.session.username = ctx.message.text.toUpperCase();

    await ctx.reply(
      `🔒 Please enter your *Password* for ${ctx.session.username}:\n_(Your password is safe. It will be deleted from memory right after scraping)_`,
      { parse_mode: "Markdown" },
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;
    ctx.session.password = ctx.message.text;

    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch (e) {
      console.warn(
        "Could not delete password message. Bot needs message deletion rights.",
      );
    }

    const inlineKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("S1", "1"),
        Markup.button.callback("S2", "2"),
        Markup.button.callback("S3", "3"),
      ],
      [
        Markup.button.callback("S4", "4"),
        Markup.button.callback("S5", "5"),
        Markup.button.callback("S6", "6"),
      ],
      [Markup.button.callback("S7", "7"), Markup.button.callback("S8", "8")],
    ]);

    await ctx.reply("📚 Select the Semester:", inlineKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;

    if (!["1", "2", "3", "4", "5", "6", "7", "8"].includes(data)) {
      await ctx.reply("Invalid semester selected. Try again.");
      return;
    }

    try {
      await ctx.editMessageText(`📚 Selected Semester: S${data}`);
    } catch (e) {
      console.warn("Could not edit semester selection message.");
    }

    ctx.session.semester = data;

    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();

    if (!checkRateLimit(userId)) {
      await ctx.reply(
        "🛑 You have exceeded your rate limit. Please try again later (Max 5 requests per hour).",
      );
      return ctx.scene.leave();
    }

    const initMsg = await ctx.reply(
      "⏳ Fetching your data... KTU servers may take a while.",
    );

    try {
      await addJobToQueue({
        userId: userId,
        chatId: ctx.chat!.id,
        messageId: initMsg.message_id,
        username: ctx.session.username!,
        password: ctx.session.password!,
        semester: data as Semester,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        initMsg.message_id,
        undefined,
        `❌ ${errorMsg}`,
      );
    }

    return ctx.scene.leave();
  },
);
