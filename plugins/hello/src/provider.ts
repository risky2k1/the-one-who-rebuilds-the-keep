import type { ServiceProvider } from '@keep/core';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';

export default {
  controllers: [HelloController],
  providers: [HelloService],
  register(ctx) {
    ctx.permissions.add({ id: 'hello.view', label: 'View hello' });
    ctx.menu.add({
      id: 'hello',
      title: 'Hello',
      url: '/admin/hello',
      order: 100,
      permission: 'hello.view',
      icon: 'hand',
    });
  },
} satisfies ServiceProvider;
