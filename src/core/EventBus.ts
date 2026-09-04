/**
 * SpatialKit — EventBus
 * Simple typed pub/sub event system for internal framework communication.
 */

type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler as EventHandler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(
        event,
        handlers.filter((h) => h !== handler)
      );
    }
  }

  emit<T>(event: string, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const globalBus = new EventBus();
