/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-no-outer',
      severity: 'error',
      comment: 'Core must not depend on apps, packages, plugins, or themes',
      from: {
        path: '^core/',
      },
      to: {
        path: '^(apps|packages|plugins|themes)/',
      },
    },
    {
      name: 'packages-only-core',
      severity: 'error',
      comment: 'Packages may only depend on core, not on apps, plugins, or themes',
      from: {
        path: '^packages/',
      },
      to: {
        path: '^(apps|plugins|themes)/',
      },
    },
    {
      name: 'no-cross-plugin',
      severity: 'error',
      // shortcut: chặn mọi import chéo plugin, kể cả phụ thuộc đã khai báo; khi Phase 7 cần blog -> page thì sinh allowlist từ plugin.json
      from: {
        path: '^plugins/([^/]+)/',
      },
      to: {
        path: '^plugins/',
        pathNot: '^plugins/$1/',
      },
    },
    {
      name: 'nothing-imports-apps',
      severity: 'error',
      comment: 'Nothing outside apps should import anything from apps',
      from: {
        pathNot: '^apps/',
      },
      to: {
        path: '^apps/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: '(^|/)(dist|test/fixtures|\\.tmp)/',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      conditionNames: ['development', 'import', 'default'],
    },
  },
};
