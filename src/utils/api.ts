/**
 * Defensive HTTP Client Utility
 * Ensures we never crash with unhandled "Unexpected token..." when the server
 * returns an HTML error page or standard plain-text exception pages.
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      let responseText = "";
      let responseJson: any = null;

      try {
        responseText = await res.text();
        if (isJson) {
          try {
            responseJson = JSON.parse(responseText);
          } catch (e) {
            // Not actually valid JSON
          }
        }
      } catch (textErr) {
        responseText = "unreadable server response";
      }

      const errorMessage = responseJson?.error || responseJson?.message || responseText.substring(0, 120).trim() || res.statusText || "status code failure";
      const error: any = new Error(`Server Error (${res.status}): ${errorMessage}`);
      error.status = res.status;
      error.responseJson = responseJson;
      error.responseText = responseText;
      throw error;
    }

    // Check if the content is actually JSON for successful responses
    if (!isJson) {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch (e) {
        bodyText = "unreadable format";
      }
      const snippet = bodyText.substring(0, 120).trim();
      throw new Error(`Invalid content-type (Expected JSON, got '${contentType}'): ${snippet}`);
    }

    try {
      return await res.json();
    } catch (parseErr: any) {
      throw new Error(`JSON Syntax Error: ${parseErr.message}`);
    }
  } catch (err: any) {
    console.error(`Networking call failed for ${url}:`, err);
    throw err;
  }
}

