import { auth } from "@/lib/auth";
import {
  registerStreamClient,
  unregisterStreamClient,
} from "@/lib/notifications-stream";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorised", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      registerStreamClient(userId, controller);

      controller.enqueue(`data: connected\n\n`);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(`: keepalive\n\n`);
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        unregisterStreamClient(userId, controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
