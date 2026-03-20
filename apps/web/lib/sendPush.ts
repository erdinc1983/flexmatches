export async function sendPush(targetUserId: string, title: string, body: string, url?: string) {
  try {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, title, body, url }),
    });
  } catch {
    // Push notifications are best-effort, never block the user flow
  }
}
