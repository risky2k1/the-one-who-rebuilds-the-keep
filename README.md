# Keep (`the-one-who-rebuilds-the-keep`)

Modular CMS Kernel and Service Provider built with TypeScript, NestJS, and Kysely.

## Requirements
- Node.js: `24.x` (LTS)
- pnpm: `12.18.0` (hoặc `9.15+`)

## Getting Started
```bash
# Cài đặt dependencies
pnpm install

# Kiểm tra kiểu
pnpm typecheck

# Chạy unit tests
pnpm test:unit

# Chạy integration tests (yêu cầu MySQL)
export KEEP_TEST_ADMIN_URL=mysql://root:changeme_root_password@127.0.0.1:3306/
pnpm test:int

# Build production artifacts
pnpm build

# Khởi chạy development server (source mode qua SWC)
KEEP_DATABASE_URL=mysql://cms_user:changeme_db_password@127.0.0.1:3306/keep_db pnpm dev

# Chạy production build (dist mode)
pnpm build
KEEP_DATABASE_URL=mysql://cms_user:changeme_db_password@127.0.0.1:3306/keep_db node apps/server/dist/main.js
```

## Docker Build
```bash
# Build dev target
docker build --target dev -t keep:dev .

# Build prod target
docker build --target prod -t keep:prod .
```

## Architecture
Xem chi tiết tại [docs/architecture.md](file:///home/tuanpm1/Dev/the-one-who-rules-them-all/services/new-cms/docs/architecture.md) và các quyết định tại [docs/decisions.md](file:///home/tuanpm1/Dev/the-one-who-rules-them-all/services/new-cms/docs/decisions.md).
