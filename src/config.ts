import "dotenv/config";

export const BOT_TOKEN = process.env.BOT_TOKEN!;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing in environment variables.");
  process.exit(1);
}
