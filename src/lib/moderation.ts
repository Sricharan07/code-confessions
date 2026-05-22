/**
 * VibeFail Moderation & Security Sanitizer
 * Handles HTML stripping, URL limits, local keyword blocklists, and OpenAI Moderation checks.
 */

const BANNED_WORDS = [
  "kill yourself",
  "kys",
  "threaten",
  "harass",
  "spamspamspam",
  "nigga",
  "nigger",
  "faggot",
  "retard"
];

/**
 * Validates text for HTML tags (XSS prevention) and limit URLs count
 */
export function validateUrlsAndXss(body: string, title?: string): void {
  const combined = `${title || ""} ${body}`;
  
  // HTML Tag Detection
  if (/<[^>]*>/g.test(combined)) {
    throw new Error("HTML tags are strictly prohibited. Keep your code disasters in text format!");
  }

  // Max 5 URLs
  const urlCount = (body.match(/https?:\/\/[^\s]+/gi) || []).length;
  if (urlCount > 5) {
    throw new Error("Spam detected: You cannot include more than 5 URLs in a post body.");
  }
}

/**
 * Runs combined text through a community safety keyword blocklist and the OpenAI Moderation API.
 */
export async function moderateContent(title: string, body: string): Promise<void> {
  const combinedText = `${title}\n\n${body}`;
  const lowercaseText = combinedText.toLowerCase();

  // 1. Basic word filter (always runs)
  for (const word of BANNED_WORDS) {
    if (lowercaseText.includes(word)) {
      throw new Error("Your post contains flagged keywords. Keep it clean about code disasters, not personal attacks.");
    }
  }

  // 2. OpenAI Moderation API
  // Uses OPENAI_API_KEY from environment variables
  const apiKey = process.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: combinedText }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.results?.[0]?.flagged) {
          throw new Error("Flagged by AI: Your content contains hate speech, sexual content, or severe harassment. Please adjust it.");
        }
      } else {
        console.warn("OpenAI Moderation API returned non-OK response status:", response.status);
      }
    } catch (err: any) {
      console.warn("OpenAI Moderation check bypassed due to exception:", err.message || err);
    }
  }
}
