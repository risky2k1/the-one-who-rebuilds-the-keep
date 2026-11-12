import type { ServiceProvider } from '@keep/core';

export default {
  register: () => {
    ((globalThis as unknown as { __keepTrace: string[] }).__keepTrace ??= []).push(
      'register:alpha'
    );
  },
  boot: () => {
    ((globalThis as unknown as { __keepTrace: string[] }).__keepTrace ??= []).push(
      'boot:alpha'
    );
  },
} satisfies ServiceProvider;
