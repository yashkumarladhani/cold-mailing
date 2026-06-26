/**
 * Safely fetches and parses JSON responses from our backend.
 * Provides beautiful, human-readable errors if the backend is not reachable,
 * returns 404 (e.g. deployed on Vercel/Netlify without a backend), or returns invalid HTML instead of JSON.
 */
export async function safeFetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err: any) {
    throw new Error(
      `Network failure calling API endpoint. Please check if your backend server is active and reachable. Error: ${err.message}`
    );
  }

  const text = await response.text();

  // If response is not ok (e.g., 400, 500, 404, etc.)
  if (!response.ok) {
    // Try to parse error from backend JSON
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.error || parsed.message)) {
        throw new Error(parsed.error || parsed.message);
      }
    } catch {
      // Not JSON, handle below
    }

    if (response.status === 404) {
      throw new Error(
        `Backend API Endpoint Not Found (404). If you have deployed this app to a platform like Vercel or Netlify, please note that they host only static files by default. You need a live Node.js/Express server (such as Google Cloud Run or Render) to run this application's API endpoints.`
      );
    }

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error(
        `Received HTML instead of JSON (Status ${response.status}). This usually means the server-side API endpoints are not active or the request was intercepted by a static host router.`
      );
    }

    throw new Error(`Server returned status ${response.status}. Raw Response: ${text.substring(0, 150)}`);
  }

  // Try to parse the successful JSON
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error(
        "API returned HTML instead of JSON. This typically happens when deployed on Vercel/Netlify as a frontend-only app, resulting in a 404 HTML fallback page being served. Please run on a full-stack platform like Google Cloud Run."
      );
    }
    throw new Error(
      `Failed to parse JSON response from server. Raw content: ${text.substring(0, 150)}`
    );
  }
}
