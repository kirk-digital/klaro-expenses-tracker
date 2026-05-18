// TODO: replace with Redis pub/sub for multi-instance deployments
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

export function registerStreamClient(
  userId: string,
  controller: ReadableStreamDefaultController
) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(controller);
}

export function unregisterStreamClient(
  userId: string,
  controller: ReadableStreamDefaultController
) {
  clients.get(userId)?.delete(controller);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}
