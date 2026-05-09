import fetchDetails from "../fetchDetails";
import type { Semester } from "../fetchDetails/functions";
import type { GradesBySemester } from "../fetchDetails/parser";

export interface ScrapeJobData {
  userId: number;
  chatId: number;
  username: string;
  password: string;
  semester: Semester;
  messageId: number;
}

export type ScrapeProgressCallback = (message: string) => Promise<void>;

export async function runScraper(
  data: ScrapeJobData,
  _onProgress: ScrapeProgressCallback,
): Promise<GradesBySemester | undefined> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("KTU Timeout: Server took too long to respond.")),
          60000,
        ),
      );

      const resultPromise = fetchDetails({
        username: data.username,
        password: data.password,
        semester: data.semester,
      });

      const result = await Promise.race<(GradesBySemester | undefined) | never>(
        [resultPromise, timeoutPromise],
      );

      if (!result) {
        throw new Error("Invalid credentials or KTU structure changed.");
      }

      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Scrape attempt ${attempt} failed: ${errorMsg}`);

      if (
        errorMsg.includes("Invalid credentials") ||
        errorMsg.includes("Invalid KTU ID or Password") ||
        errorMsg.includes("Invalid KTU Credentials.") ||
        errorMsg.includes(
          "KTU Login Failure: Error ! Invalid username or password.",
        )
      ) {
        throw new Error(errorMsg);
      }

      if (attempt >= maxRetries) {
        throw error;
      }

      const backoffDelay = attempt * 5000;
      await new Promise((res) => setTimeout(res, backoffDelay));
    }
  }
}
