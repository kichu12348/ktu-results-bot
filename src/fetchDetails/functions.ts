import { config, BROWSER_HEADERS } from "./config";
import { resilientFetch } from "./fetchClient";
import { extractCookiesToJar, getCookieString } from "./cookies";
import { parseGradeCard } from "./parser";

export type Semester = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MAX_REDIRECTS = 5;

// const test = `<div id="loginFailureDiv" style="">
//                                              <div class="alert alert-danger">Error ! Invalid username or password.</div>
// 										</div>
// `;

// const LOGIN_FAILED_ERROR_DIV =
//   /<div[^>]*?id="loginFailureDiv"[^>]*>[\s\S]*?<div[^>]*?class="alert alert-danger"[^>]*>(.*?)<\/div>[\s\S]*?<\/div>/;

// const match = test.match(LOGIN_FAILED_ERROR_DIV);
// if (match) {
//   console.log(match[1]);
// }

export async function fetchLoginCsrfToken() {
  try {
    const cookieJar = new Map<string, string>();
    const res = await resilientFetch(config.LOGIN_URL, {
      method: "GET",
      headers: BROWSER_HEADERS,
    });
    if (res.status === 526) {
      return {
        error:
          "KTU has not Updated their SSL certificate. Please try again later.",
        isOverLoaded: false,
        isSSLError: true,
      };
    }

    if (res.status >= 500 && res.status < 600) {
      return {
        error: "Failed to connect to KTU (Server error)",
        isOverLoaded: true,
      };
    }

    const html = await res.text();
    const csrfMatch = html.match(
      /<input[^>]*name="CSRF_TOKEN"[^>]*value="([^"]+)"/i,
    );
    const formCsrf = csrfMatch ? csrfMatch[1] : "";
    if (!formCsrf) {
      return {
        error: "Failed to connect to KTU (No CSRF found)",
      };
    }
    extractCookiesToJar(res, cookieJar);
    const cookies = getCookieString(cookieJar);

    return { csrfToken: formCsrf.toString(), sessionCookie: cookies };
  } catch (e) {
    console.error("Error occurred while fetching login CSRF token:", e);
    return { error: "Failed to fetch login CSRF token" };
  }
}

export async function performLogin({
  username,
  password,
  csrfToken,
  sessionCookie,
}: {
  username: string;
  password: string;
  csrfToken: string;
  sessionCookie: string;
}) {
  try {
    if (!username || !password || !csrfToken || !sessionCookie) {
      return { error: "Missing credentials" };
    }

    // --- VIRTUAL COOKIE JAR ---
    const cookieJar = new Map<string, string>();
    let currentUrl = config.LOGIN_URL;
    let response;

    // Populate cookieJar from provided session cookie string
    sessionCookie.split(";").forEach((cookieStr) => {
      const [name, ...rest] = cookieStr.trim().split("=");
      if (name && rest.length > 0) {
        cookieJar.set(name, rest.join("="));
      } else if (name) {
        cookieJar.set(name, "");
      }
    });

    if (!csrfToken) {
      return { error: "Failed to connect to KTU (Missing CSRF)" };
    }
    // STEP 2: The Attack Payload
    const payload = new URLSearchParams({
      CSRF_TOKEN: csrfToken,
      username: username,
      password: password,
    });

    // STEP 3: The Redirect Chaser
    let fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieString(cookieJar),
        Origin: config.BASE_URL,
        Referer: config.LOGIN_URL,
      },
      body: payload.toString(),
      redirect: "manual", // Stop auto-redirects so we can manually catch cookies
    };

    let maxRedirects = MAX_REDIRECTS;
    let redirectCount = 0;
    let loginSuccessful = false;

    while (redirectCount < maxRedirects) {
      response = await resilientFetch(currentUrl, fetchOptions);

      // Update our jar with any cookies dropped on this hop
      extractCookiesToJar(response, cookieJar);

      // If KTU throws a 301, 302, 303, 307, or 308, we must follow it!
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        let location = response.headers.get("location");
        if (!location) break;

        // Handle relative URLs (e.g. "/eu/stu/studentDashboard.htm")
        if (location.startsWith("/")) {
          currentUrl = config.BASE_URL + location;
        } else {
          currentUrl = location;
        }

        // Check if we reached the promised land (Dashboard)
        if (
          currentUrl.includes("dashboard.htm") ||
          currentUrl.includes("home.htm")
        ) {
          loginSuccessful = true;
        }

        // Standard browser behavior: Turn the POST into a GET for the next hop
        fetchOptions = {
          method: "GET",
          headers: {
            ...BROWSER_HEADERS,
            Cookie: getCookieString(cookieJar), // Pass the updated jar to the next hop!
          },
          redirect: "manual",
        };

        redirectCount++;
      } else {
        // Reached a 200 OK or an Error page
        if (
          response.status === 200 &&
          (currentUrl.includes("dashboard.htm") ||
            response.url.includes("dashboard.htm"))
        ) {
          loginSuccessful = true;
        }
        break;
      }
    }

    // STEP 4: Verification
    const finalCookies = getCookieString(cookieJar);

    if (!loginSuccessful || !finalCookies.includes("JSESSIONID")) {
      return { error: "Invalid KTU ID or Password" };
    }

    return {
      message: "Login successful",
      sessionCookie: finalCookies,
    };
  } catch (e) {
    console.error("Error occurred while logging in:", e);
    return { error: "Login failed: " + (e as Error).message };
  }
}

export async function getGradeCardToken(sessionCookie: string) {
  try {
    const res = await resilientFetch(config.GRADE_CARD_URL, {
      headers: { ...BROWSER_HEADERS, Cookie: sessionCookie },
    });

    const html = await res.text();

    const patten =
      /<input[^>]*name="CSRF_TOKEN"[^>]*id="semesterGradeCardListingSearchForm_CSRF_TOKEN"[^>]*value="([^"]+)"[^>]*>/;
    const match = html.match(patten);
    const formCsrf = match && match[1] ? match[1] : null;

    if (!formCsrf) {
      console.error("Couldn't find the form CSRF token!");
      throw new Error("Failed to extract CSRF token");
    }

    return { csrfToken: formCsrf.toString() };
  } catch (e) {
    console.error("Error occurred while fetching CSRF token:", e);
    return { error: "Failed to fetch CSRF token" };
  }
}

export async function fetchGradeCardResults({
  sessionCookie,
  csrfToken,
  semester,
}: {
  sessionCookie: string;
  csrfToken: string;
  semester: Semester;
}) {
  try {
    if (!csrfToken) {
      console.error("Couldn't find the form CSRF token!");
      throw new Error("Needed CSRF token to fetch grade card results");
    }

    if (!["1", "2", "3", "4", "5", "6", "7", "8"].includes(semester)) {
      console.error("Invalid semester provided!");
      throw new Error("Invalid semester provided");
    }

    const searchPayload = new URLSearchParams({
      CSRF_TOKEN: csrfToken,
      form_name: "semesterGradeCardListingSearchForm",
      semesterId: semester,
      stdId: "",
      search: "Search",
    });

    let gradePostRes;
    try {
      gradePostRes = await resilientFetch(config.GRADE_CARD_URL, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: sessionCookie,
        },
        body: searchPayload.toString(),
      });
    } catch (e) {
      console.error(
        "Server 502/Timeout on POST. Retry loop should kick in here!",
      );
      throw new Error("Failed to fetch grade card results", { cause: e });
    }
    const resultsHtml = await gradePostRes.text();
    // --- 3. PARSE THE RESULTS ---
    try {
      const gradeCardData = parseGradeCard(resultsHtml, semester);
      return gradeCardData;
    } catch (e) {
      console.error("Error parsing grade card results:", (e as Error).message);
      throw new Error("Failed to parse grade card results", { cause: e });
    }
  } catch (e) {
    console.error("Error occurred while fetching grade card:", e);
    return {
      error: "Failed to fetch grade card: " + (e as Error).message,
    };
  }
}
