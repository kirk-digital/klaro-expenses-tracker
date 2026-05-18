import { auth } from "@/lib/auth";

// TODO: replace with Redis pub/sub for multi-instance deployments
// Keep track of active streams per user
// In production this would be Redis pub/sub — for now, use a module-level Map
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function notifyUser(userId: string) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  userClients.forEach((controller) => {
    try {
      controller.enqueue(`data: ping\n\n`);
    } catch {
      // client disconnected
    }
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorised", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      // Register this client
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId)!.add(controller);

      // Send initial ping to confirm connection
      controller.enqueue(`data: connected\n\n`);

      // Send a keepalive comment every 25 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(`: keepalive\n\n`);
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        clients.get(userId)?.delete(controller);
        if (clients.get(userId)?.size === 0) clients.delete(userId);
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
