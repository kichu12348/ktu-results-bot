import type { Context, Scenes } from "telegraf";

export interface BotSession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  username?: string;
  password?: string;
  semester?: string;
  rateLimitTokens?: number;
  lastRequestTime?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface BotContext extends Context {
  session: BotSession;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}
