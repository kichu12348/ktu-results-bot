# KTU Results Bot

A Telegram bot built to seamlessly fetch Kerala Technological University (KTU) academic results in the background. Built with **TypeScript**, **Bun**, and the **Telegraf** framework.

## ? Features

- **Automated Result Fetching:** Get your academic results delivered directly to your Telegram chat.
- **Background Queue System:** Requests are processed in a queue to prevent overloading the KTU portal.
- **Job Management:** Track your request status or cancel ongoing jobs dynamically.
- **Session Support:** Persistent queuing system backed by local storage (`db.json`).

## ?? Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Language:** TypeScript
- **Bot Framework:** [Telegraf](https://telegraf.js.org/)

## ?? Prerequisites

Before you begin, ensure you have met the following requirements:
- [Bun](https://bun.sh/) installed on your machine.
- A Telegram Bot Token. You can get one by chatting with [@BotFather](https://t.me/BotFather) on Telegram.

## ?? Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kichu12348/ktu-results-bot.git
   cd ktu-results-bot
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Create a new file named `.env` in the root of the project and add your Telegram Bot Token:
   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   ```

## ?? Usage

Start the bot for local development (with auto-reload):
```bash
bun run dev
```

Start the bot in production mode:
```bash
bun run start
```

## ?? Bot Commands

Once the bot is running, interact with it on Telegram using the following commands:

| Command | Description |
| --- | --- |
| `/start` | Start the bot and see the welcome message |
| `/fetch` | Start a new wizard to grab your results |
| `/status` | Check the status of your active background request |
| `/cancel` | Cancel your active/ongoing background request |
| `/help` | View the help menu and commands details |
| `/github` | Get the link to this source code repository |

## ?? Project Structure

```text
src/
+-- bot.ts               # Main entry point of the bot
+-- config.ts            # Environment and global configuration
+-- core/                # Background queue and scraping core logic
+-- fetchDetails/        # KTU site API clients, parsers, and connection management
+-- scenes/              # Telegraf wizard scenes (UI flows)
+-- types/               # TypeScript interfaces and type definitions
+-- utils/               # Utility functions (rate limits, state saving)
```

## ?? Disclaimer & Warnings

> **Note on Account Lockouts:**
> Making too many requests can temporarily disable your KTU account. If your account gets disabled, you can typically resolve this by resetting your password directly on the KTU Student Portal.

## ? Support

Made Wid ❤️ by [Kichu](https://instagram.com/belulu.lulu).

If you found this tool helpful, consider supporting the development!
<a href="https://buymeacoffee.com/rmahadevane"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="200" /></a>

