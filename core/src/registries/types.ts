import type { Registry } from './registry.js';

/**
 * Permission node in the hierarchical permission tree.
 */
export interface PermissionNode {
  id: string;
  parentId?: string;
  label: string;
}

/**
 * Navigation item in the admin menu.
 */
export interface AdminMenuItem {
  id: string;
  parentId?: string;
  title: string;
  url: string;
  order: number;
  permission?: string;
  icon?: string;
}

/**
 * Global registries collection provided to plugins during registration and boot.
 */
export interface Registries {
  permissions: Registry<PermissionNode>;
  menu: Registry<AdminMenuItem>;
}
