import type { AdminMenuItem, PermissionNode, Registries } from './types.js';

/**
 * Freezable typed registry maintaining insertion order and rejecting duplicate ids.
 */
export class Registry<T extends { id: string }> {
  private readonly items: T[] = [];
  private readonly ids: Set<string> = new Set();
  private frozen = false;

  constructor(public readonly name: string) {}

  /**
   * Add an item to the registry.
   * Throws if registry is frozen or if item id already exists.
   */
  add(item: T): void {
    if (this.frozen) {
      throw new Error(`${this.name} registry is frozen`);
    }
    if (this.ids.has(item.id)) {
      throw new Error(`Duplicate id "${item.id}" in ${this.name} registry`);
    }
    this.ids.add(item.id);
    this.items.push(item);
  }

  /**
   * Return a readonly snapshot of all registered items in insertion order.
   */
  all(): readonly T[] {
    return [...this.items];
  }

  /**
   * Freeze the registry to prevent further additions.
   */
  freeze(): void {
    this.frozen = true;
  }

  /**
   * Check whether the registry has been frozen.
   */
  get isFrozen(): boolean {
    return this.frozen;
  }
}

/**
 * Create default empty registries for permissions and admin menu.
 */
export function createRegistries(): Registries {
  return {
    permissions: new Registry<PermissionNode>('permissions'),
    menu: new Registry<AdminMenuItem>('menu'),
  };
}
