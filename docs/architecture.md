Bản chép từ repo master ngày 2026-11-12. Spec điều khiển: docs/superpowers/specs/2026-11-12-keep-modular-cms-design.md trong repo master.

# ROLE
You are a senior software architect and engineer. You are building, from scratch, a
modular CMS platform inspired by the *architecture* of Botble CMS (Laravel): a small
immutable core, shared packages, optional plugins, and swappable themes.

# IMPORTANT CONSTRAINTS
- Prefer simple, readable, well-typed code over clever abstractions. No speculative
  features. Every abstraction must be justified by a concrete use in this repo.
- Work in small phases. After each phase: run the tests, show what works, list known
  gaps, then STOP and wait for my confirmation before starting the next phase.
- This project lives as an independent service submodule at `services/<name>` inside a
  master orchestration repo. It owns BUILD only: a `Dockerfile` with `base`, `dev`, `prod`
  stages and a `.dockerignore`. It MUST NOT contain `compose.yaml`/`docker-compose.yml`;
  runtime wiring (compose profile, MySQL, Redis, env) is added in the master repo.
  It uses its OWN MySQL database and never touches the existing Botble CMS database.

# STACK
- Runtime/language: Node.js 24 LTS, TypeScript (strict mode)
- Framework: NestJS with the Fastify adapter (use Nest modules/providers/dynamic modules
  as the DI foundation)
- Database: MySQL 8. Use Kysely (type-safe query builder):
  - Core exposes a base `Kysely<CoreTables>` instance.
  - Packages and plugins MUST define their own table interfaces locally and scope queries
    via Kysely's `db.withTables<PluginTables>()` (never use `any` and never import plugin
    table types into `/core`).
  - Build a CUSTOM migration runner that supports one migration directory per owner
    (`core`, `package:<id>`, `plugin:<id>`) and records applied migrations in a
    `migrations` table with an `owner` column. Wrap every migration run in a MySQL
    `GET_LOCK()`/`RELEASE_LOCK()` so two instances never migrate concurrently.
- Public site: NO server-side templating for now (TODO, deferred) — the separate Next.js FE
  service renders it. No Eta, no view namespaces, no HTMX.
- Admin UI: a React SPA in `apps/admin` (Vite + React 19 + TS strict), components from
  neobrutalism.dev (shadcn registry) on Tailwind v4, React Router 7, TanStack Query,
  react-hook-form + zod, TanStack Table, i18next. Served same-origin by the server at
  `/admin` (`@fastify/static`, SPA fallback); admin API lives under `/api/admin/*`.
  The admin is SCHEMA-DRIVEN: plugins ship no React code in v1; they declare menu items,
  form schemas and table schemas, and the admin renders them with generic renderers.
- Admin API types come from an OpenAPI 3.1 spec kept in the master repo's
  `contracts/openapi/keep-admin.v1.yaml` (`openapi-typescript`).
- Cache/queue: Redis (BullMQ) added only when a phase needs it.
- Decorators: NestJS DI needs `emitDecoratorMetadata`, which esbuild (`tsx`, plain Vitest)
  does NOT emit. Use SWC everywhere: `nest start -b swc` / `@swc-node/register` for dev,
  `unplugin-swc` in `vitest.config.ts`. Do not use `tsx`.
- Testing: Vitest + Supertest, with a real MySQL for integration tests: each test creates and drops its own `keep_test_<uuid>` database on the already-running MySQL (`KEEP_TEST_ADMIN_URL`)
  (no compose file in this repo).
- Package manager: pnpm workspaces.

# ARCHITECTURE (4 layers)
/core      Cannot be disabled. Bootstrap, container glue, async hook system, permission
           registry, settings, plugin manager, admin API, form/table builders.
           Core knows NOTHING about specific plugins. It only exposes "sockets"
           (registries, hooks, interfaces).
/packages  Shared, usually-always-on libraries: menu, widget, shortcode, slug, seo,
           revision. Depend on core only.
/plugins   Optional features that can be activated/deactivated: page, blog, contact,
           later ecommerce. May depend on core and packages, and on other plugins
           ONLY if declared in the manifest.
/themes    DEFERRED (Phase 6). Keep the folder empty. Original intent: presentation only.
           Themes consume data only through view contracts: core exposes the GENERIC
           contract (layout, site, menus, widget areas); each plugin exports its OWN
           view-data types for the templates a theme may override.
/apps/server  Composition root. The ONLY place allowed to import core + packages +
           the plugin loader and call `NestFactory.create()`. Packages are always-on and
           are wired here statically (as Nest modules), never discovered at runtime.

## Dependency rules (enforced with dependency-cruiser from Phase 1 + an architectural test)
- core -> nothing in packages/plugins/themes/apps
- packages -> core
- plugins -> core, packages, and declared plugin dependencies only
- plugin <-> plugin communication otherwise goes through hooks/events or interfaces
  defined in core
- themes -> (deferred) core generic view contract + view-data types of the plugins they override
- apps/server -> anything
- apps/admin -> only its own code + generated API types; never imports core/packages/plugins

# PLUGIN CONTRACT & NESTJS INTEGRATION
Each plugin is a self-contained folder:

plugins/<id>/
  plugin.json                 manifest
  src/provider.ts             ServiceProvider (register / boot / controllers / providers)
  src/controllers/ or routes/ admin + public HTTP endpoints
  src/models/ or repositories/
  database/migrations/
  lang/
  tests/

Manifest example:
~~~json
{
  "id": "blog",
  "name": "Blog",
  "version": "1.0.0",
  "requires": { "core": ">=1.0.0", "packages": { "slug": ">=1.0.0" }, "plugins": ["page"] },
  "entry": "./src/provider"
}
~~~
*(Note: The loader must resolve `entry` cleanly across both `.ts` in dev/test via SWC and
`.js` in compiled builds, and reject any `entry` that resolves outside the plugin folder.
Package ids/versions come from each package's `package.json` (`name`, `version`).)*

ServiceProvider interface & Two-Stage Bootstrap:
- A `ServiceProvider` is a PLAIN object (not a Nest provider) exported from `entry`:
  `{ controllers?, providers?, register(ctx), boot(ctx) }`. `register` runs in the
  Pre-Nest stage (no DI available). `boot` runs from core's `OnApplicationBootstrap`,
  and `ctx.moduleRef` gives it access to DI-resolved services.
- Because NestJS compiles its DI container and route graph during `NestFactory.create()`,
  plugins integrate via a **two-stage bootstrap**:
  1. Pre-Nest stage: Core initializes the database connection, ensures Core system
     migrations (`migrations`, `plugins_state`) are applied, scans `/plugins/*/plugin.json`,
     queries the DB for activated plugins, and resolves topological load order.
  2. Nest DI stage: Core dynamically composes a `PluginsHostModule` (`DynamicModule`)
     containing the Nest `@Controller()` classes and DI `providers` exported by active
     plugins (so Nest Guards, Pipes, Interceptors, and DI work natively inside plugins).
- `register(ctx)`: runs during bootstrap in topological order BEFORE `boot()`. Used to
  declare permissions, menu items, settings keys, hooks, and widgets into Core registries.
  No cross-plugin side effects or DB queries here.
- `boot(ctx)`: runs in topological order AFTER all active providers have completed
  `register()`. May read other registries and wire up cross-plugin hooks. Once all
  providers finish `boot()`, Core freezes the registries so hooks/menus/permissions
  cannot be mutated inside HTTP request handlers (preventing memory leaks in Node.js).
- `routes()` / `controllers`: plugins may expose NestJS `@Controller()` classes and/or
  typed route definitions mounted under admin (`/api/admin/...`) and public (`/api/v1/...`) prefixes.

# PLUGIN MANAGER LIFECYCLE
0. Core Init: ensure core database tables (`migrations`, `plugins_state`) exist.
1. Discover: scan `/plugins/*/plugin.json`, validate against a strict schema.
2. Resolve: check semver versions + dependencies (`core`, `packages`, `plugins`),
   topologically sort load order, and report dependency cycles or missing dependencies
   with clear, actionable error messages.
3. Filter: only load plugins marked `activated` in the `plugins_state` table (ensure all
   required dependencies of an activated plugin are also activated). Then run any
   PENDING migrations of all packages and active plugins (covers plugin version upgrades),
   in topological order, before Register.
4. Compose & Register: mount active plugin providers/controllers into the NestJS
   `DynamicModule` and execute `await provider.register(ctx)` in topological order.
5. Boot & Freeze: execute `await provider.boot(ctx)` on all active providers in order,
   then freeze Core registries.
6. Mount routes & start listening.
7. Admin actions:
   - `activate`: verify dependencies -> run plugin `up` migrations -> publish assets ->
     mark active in DB.
   - `deactivate`: check no other active plugin depends on it -> mark inactive in DB
     (keep data).
   - `remove`: must be deactivated first -> run plugin `down` migrations after
     confirmation -> clean up state.
*(Hot activation without restart is NOT required in v1. A graceful in-process app
re-bootstrap or restart is acceptable, provided the design stays clean. The admin API must
report `restartRequired: true` after activate/deactivate until the app reloads).*

# CORE REGISTRIES (needed early)
- Hooks: **async-first**, strictly typed actions and filters with numeric priorities:
  `addAction(hook, fn, priority)`, `await doAction(hook, ...args)`,
  `addFilter(hook, fn, priority)`, `await applyFilters(hook, initialValue, ...args)`.
  Registrations are only allowed during `register`/`boot`.
  Typing: core declares an empty `interface HookMap {}` (hook name -> args/value types);
  plugins extend it via `declare module '@keep/core'` (declaration merging). No `string`
  + `unknown` fallback for registered hooks.
- Permissions: plugins declare permission nodes like `"posts.create"` in a tree structure;
  roles map to permission flags in DB; a NestJS Guard checks them on admin routes.
- Admin menu: plugins register items (`id`, `parentId`, `title`, `url`, `order`,
  `permission`, `icon`). Menu tree is filtered per-request by the current user's permissions.
- Settings: key-value store in DB with in-memory/Redis cache and typed accessors.
- Dashboard widgets, and form/table field-type registries (later phases).

# PHASES (do one at a time)
Phase 1 - Kernel skeleton
  pnpm monorepo + multi-stage Dockerfile + `apps/server` composition root + SWC toolchain
  + dependency-cruiser rules. Kysely base setup (`withTables` pattern), per-owner
  migration runner, `ServiceProvider` interface, plugin manifest schema, `PluginManager`
  (steps 0-6 with two-stage NestJS `DynamicModule` integration), stubbed Core registries
  (enough for `hello` to register a permission and menu item), and a fake `hello` plugin.
  Done when: integration tests prove discovery, topological dependency ordering, cycle
  detection, missing-dependency rejection, deactivated plugins not loaded, per-owner
  migrations tracked properly, pending migrations of an active plugin applied on boot,
  dependency-cruiser fails on a core -> plugin import, and the `hello` plugin route
  responds via Supertest (with a DI-injected service, proving decorator metadata works).
Phase 2 - Hooks, permissions, settings
  Full async Hook system (actions + filters with priority), permission registry,
  roles/users tables, session auth (httpOnly cookie, SameSite=Lax, CSRF token on writes),
  ACL guard, and cached settings store.
Phase 3 - Admin API + admin shell UI
  Admin API: login/logout, current user, admin menu tree from the registry (filtered by the
  user's permissions), ACL guard in action, plugin management endpoints
  (list/activate/deactivate/remove). Admin SPA: login page, neobrutalism layout with sidebar
  built from the menu API, plugin management screen. Server serves the built SPA at `/admin`.
Phase 4 - Table builder and Form builder
  Declarative definitions -> JSON schemas (form fields, table columns) plus server-side
  pagination, sort, and filter endpoints. The admin gets generic FormRenderer (react-hook-form
  + zod) and TableRenderer (TanStack Table, server mode) that pick field components by `type`.
  CRITICAL: Both builders MUST pass their schema/columns and Kysely queries through
  async Hook filters (`form.schema`, `form.beforeSave`, `form.afterSave`, `table.columns`,
  `table.query`) so external packages/plugins (like `seo` or `slug`) can inject fields,
  columns, and persistence logic without modifying the target plugin's code.
  - Every builder hook receives the form/table id (e.g. `{ formId: 'page' }`) so packages
    can target specific entities instead of running on every form.
  - `form.beforeSave`/`form.afterSave` receive the active Kysely `trx`; injected
    persistence (e.g. seo, slug) MUST write inside that same transaction.
  - `table.query` passes a `SelectQueryBuilder` whose result type cannot stay exact once
    filters add joins/selects; type the filter boundary loosely on purpose and document
    it with an inline comment (this is the one allowed exception to strict typing).
Phase 5 - First real plugin: "page"
  Full CRUD using the Form and Table builders, with NO page-specific React code in the admin
  (only a generic rich-text field, Tiptap). Treat every awkward spot as feedback to
  refine the core sockets and builder hooks.
Phase 6 - Theme engine — DEFERRED (TODO). Not planned while the FE service renders the
  public site. Keep `/themes` empty; do not build template lookup or view namespaces.
Phase 7 - Second real plugin: "blog" & shared packages
  Build `slug` and `seo` packages (hooking into `page` and `blog` forms/tables automatically
  via Phase 4 filters), then the `blog` plugin, media manager, and `shortcode`/`menu`/`widget`
  packages.

# DELIVERABLES FOR THIS FIRST MESSAGE
1. Confirm you understood the constraints and architectural mechanisms in 5 bullets max.
2. Propose the exact repo tree for Phase 1 and list any open questions (max 5).
3. STOP and wait for my answer, then implement Phase 1 only.

# QUALITY BAR
- Strict TypeScript (`strict: true`), no `any` without an explicit inline comment explaining why.
- Every public interface and core socket documented with a concise TSDoc.
- Every phase ends with: all unit/integration tests green, README updated, and a short
  "Decisions Made" note (ADR style, a few lines each).