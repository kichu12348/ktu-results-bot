import { Telegraf } from "telegraf";
import type { BotContext } from "../types/session";
import { runScraper, type ScrapeJobData } from "./scraper";
import type { Course, GradesBySemester } from "../fetchDetails/parser";

const activeJobs = new Map<number, ScrapeJobData>();
const jobQueue: ScrapeJobData[] = [];
let isProcessing = false;

let botInstance: Telegraf<BotContext> | null = null;

export function initQueue(bot: Telegraf<BotContext>) {
  botInstance = bot;
}

export async function addJobToQueue(data: ScrapeJobData) {
  if (activeJobs.has(data.userId)) {
    throw new Error("You already have an active request processing.");
  }

  activeJobs.set(data.userId, data);
  jobQueue.push(data);
  console.log(`Job added to queue for user ${data.userId}`);

  processQueue();
}

export function cancelJob(userId: number) {
  if (activeJobs.has(userId)) {
    activeJobs.delete(userId);
    const index = jobQueue.findIndex((job) => job.userId === userId);
    if (index !== -1) {
      jobQueue.splice(index, 1);
    }
    return true;
  }
  return false;
}

export function getJobStatus(userId: number) {
  if (activeJobs.has(userId)) {
    return "Processing / In Queue";
  }
  return "No active requests";
}

async function processQueue() {
  if (isProcessing || jobQueue.length === 0) return;
  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;

    if (!activeJobs.has(job.userId)) continue;

    try {
      const result = await runScraper(job, async (progressMsg) => {
        if (!botInstance) return;
        if (!activeJobs.has(job.userId)) return;

        try {
          await botInstance.telegram.editMessageText(
            job.chatId,
            job.messageId,
            undefined,
            progressMsg,
          );
        } catch (e: unknown) {
          const isNotModified =
            typeof e === "object" && e !== null && "description" in e
              ? String(e.description).includes("message is not modified")
              : false;
          if (!isNotModified) {
            console.warn(
              `Failed to update progress: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      });

      if (!activeJobs.has(job.userId)) continue;

      await sendResult(job, result);
    } catch (error: unknown) {
      console.error(`Job failed for user ${job.userId}`, error);
      if (activeJobs.has(job.userId) && botInstance) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await botInstance.telegram
          .editMessageText(
            job.chatId,
            job.messageId,
            undefined,
            `❌ Scrape failed: ${errorMsg}\n\nPlease check your credentials and try again using /start.`,
          )
          .catch(() => {});
      }
    } finally {
      job.password = "";
      activeJobs.delete(job.userId);
    }
  }

  isProcessing = false;
}

function escapeHtml(text: string | number) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendResult(
  job: ScrapeJobData,
  result: GradesBySemester | undefined,
) {
  const bot = botInstance;
  if (!bot || !result) return;

  try {
    if (result.sgpa.trim() === "Not Available") {
      bot.telegram
        .editMessageText(
          job.chatId,
          job.messageId,
          undefined,
          `The Results Are Not Available for Semester ${job.semester}`,
        )
        .catch(() => {});
      return;
    }
    const { courses } = result;

    let message = `🎓 <b>KTU Results for ${escapeHtml(job.username)}</b>\n`;
    message += `📚 Semester: ${escapeHtml(job.semester)}\n\n`;

    if (courses && courses.length > 0) {
      message += `<b>Grades:</b>\n\n`;

      courses.forEach((c: Course) => {
        const subjectName = escapeHtml((c.course || "N/A").trim());
        const code = escapeHtml((c.code || "N/A").trim());
        const grade = escapeHtml((c.grade || "N/A").trim());
        message += `${subjectName} (${code}) - <b>${grade}</b>\n\n`;
      });
      message += "\n";
    }

    if (result.sgpa) {
      message += `🟢 <b>SGPA:</b> <code>${escapeHtml(result.sgpa)}</code>\n`;
    }

    message += `\n☕ <a href="https://buymeacoffee.com/rmahadevane">Buy me a coffee</a>`;

    await bot.telegram.editMessageText(
      job.chatId,
      job.messageId,
      undefined,
      message,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  } catch (error: unknown) {
    console.error("Failed to send results", error);
    await bot.telegram
      .editMessageText(
        job.chatId,
        job.messageId,
        undefined,
        "✅ Scrape complete, but failed to format the message cleanly.",
      )
      .catch(() => {});
  }
}
