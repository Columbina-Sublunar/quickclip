export function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
