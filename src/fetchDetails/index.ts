import * as asset from "./functions";
import type { Semester } from "./functions";

interface FetchParams {
  username: string;
  password: string;
  semester: Semester;
}

export default async function fetchDetails({
  username,
  password,
  semester,
}: FetchParams) {
  const { csrfToken, sessionCookie } = await asset.fetchLoginCsrfToken();
  if (csrfToken && sessionCookie) {
    const { sessionCookie: newSessionCookie, error } = await asset.performLogin(
      {
        username,
        password,
        csrfToken,
        sessionCookie,
      },
    );

    if (error) {
      throw new Error(typeof error === "string" ? error : String(error));
    }

    if (newSessionCookie) {
      const { csrfToken: gradeCardToken } =
        await asset.getGradeCardToken(newSessionCookie);
      if (gradeCardToken) {
        const gradeCardData = await asset.fetchGradeCardResults({
          sessionCookie: newSessionCookie,
          csrfToken: gradeCardToken,
          semester,
        });
        if (gradeCardData && "courses" in gradeCardData) {
          return gradeCardData;
        }
      }
    }
  }
}
