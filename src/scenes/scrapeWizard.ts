import { Scenes, Markup } from "telegraf";
import type { BotContext } from "../types/session";
import { checkRateLimit } from "../utils/rateLimit";
import { addJobToQueue } from "../core/queue";
import type { Semester } from "../fetchDetails/functions";

export const activeWizardChats = new Set<number>();

const clearSceneTimeout = (ctx: BotContext) => {
  if (ctx.session?.timeoutId) {
    clearTimeout(ctx.session.timeoutId);
    ctx.session.timeoutId = undefined;
  }
};

const clearSessionData = (ctx: BotContext) => {
  clearSceneTimeout(ctx);
  ctx.session = undefined as any;
};

const setSceneTimeout = (ctx: BotContext) => {
  if (ctx.chat) activeWizardChats.add(ctx.chat.id);
  clearSceneTimeout(ctx);
  ctx.session.timeoutId = setTimeout(async () => {
    try {
      await ctx.reply(
        "⏳ Session timed out due to inactivity. Please start /fetch again.",
      );
      clearSessionData(ctx);
      if (ctx.chat) activeWizardChats.delete(ctx.chat.id);
    } catch (e) {
      console.warn("Could not send timeout message");
    }
  }, 120000); // 2 minutes
};

export const scrapeWizard = new Scenes.WizardScene<BotContext>(
  "SCRAPE_WIZARD",
  async (ctx) => {
    setSceneTimeout(ctx);
    await ctx.reply(
      "📝 Let's fetch your KTU results.\n\nPlease enter your *KTU Username* (e.g. CHN23CS321):",
      { parse_mode: "Markdown" },
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    setSceneTimeout(ctx);
    if (!ctx.message || !("text" in ctx.message)) return;
    const text = ctx.message.text;
    if (
      !text ||
      text.trim() === "" ||
      text.startsWith("/") ||
      text.toLowerCase().includes("fetch") ||
      text.toLowerCase().includes("cancel") ||
      text.toLowerCase().includes("status") ||
      text.toLowerCase().includes("help") ||
      text.toLowerCase().includes("github") ||
      text.toLowerCase().includes("start")
    ) {
      await ctx.reply("Please enter a valid username.");
      await ctx.scene.reenter();
      return;
    }
    ctx.session.username = text.toUpperCase().replace(/\s+/g, "");

    await ctx.reply(
      `🔒 Please enter your *Password* for ${ctx.session.username}:\n_(Your password is safe. It will be deleted from memory right after scraping)_`,
      { parse_mode: "Markdown" },
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    setSceneTimeout(ctx);
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
      [Markup.button.callback("❌ Cancel", "cancel")],
    ]);

    await ctx.reply("📚 Select the Semester:", inlineKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;

    if (data === "cancel") {
      if (ctx.chat) activeWizardChats.delete(ctx.chat.id);
      clearSceneTimeout(ctx);
      clearSessionData(ctx);
      try {
        await ctx.editMessageText("❌ Fetch cancelled.");
      } catch (e) {
        console.warn("Could not edit message to cancelled state.");
      }
      return ctx.scene.leave();
    }

    if (!["1", "2", "3", "4", "5", "6", "7", "8"].includes(data)) {
      setSceneTimeout(ctx);
      await ctx.reply("Invalid semester selected. Try again.");
      return;
    }

    clearSceneTimeout(ctx);

    try {
      await ctx.editMessageText(`📚 Selected Semester: S${data}`);
    } catch (e) {
      console.warn("Could not edit semester selection message.");
    }

    ctx.session.semester = data;

    const userId = ctx.from?.id;
    if (!userId) {
      if (ctx.chat) activeWizardChats.delete(ctx.chat.id);
      clearSessionData(ctx);
      return ctx.scene.leave();
    }

    if (!checkRateLimit(userId)) {
      if (ctx.chat) activeWizardChats.delete(ctx.chat.id);
      clearSessionData(ctx);
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

    clearSessionData(ctx);
    if (ctx.chat) activeWizardChats.delete(ctx.chat.id);
    return ctx.scene.leave();
  },
);
