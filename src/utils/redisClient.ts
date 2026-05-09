import type { BotSession } from "../types/session";
import { Redis } from "@telegraf/session/redis";

const url = process.env.REDIS_URL!;

const redisClient = Redis<BotSession>({
  url,
});

export default redisClient;
