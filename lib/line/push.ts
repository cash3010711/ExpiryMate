/**
 * LINE Messaging API Push Notification Helper.
 */
export async function pushLineMessage(
  targetId: string,
  text: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  const token = accessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "Missing LINE_CHANNEL_ACCESS_TOKEN" };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `LINE push API error (${res.status}): ${errBody}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
