# AGENTS.md — Keep (`the-one-who-rebuilds-the-keep`)

## Purpose
`the-one-who-rebuilds-the-keep` là dịch vụ Modular CMS độc lập được xây dựng từ đầu bằng Node.js/TypeScript và NestJS theo kiến trúc module hóa (core, packages, plugins, themes).

Chi tiết kiến trúc: xem [docs/architecture.md](file:///home/tuanpm1/Dev/the-one-who-rules-them-all/services/new-cms/docs/architecture.md).

## Rules & Conventions
1. **BUILD vs RUN**:
   - Repo này sở hữu **BUILD**: `Dockerfile` (với các target `base`, `dev`, `build`, `prod`), `.dockerignore`, configs và mã nguồn dịch vụ.
   - Repo này **KHÔNG** chứa `compose.yaml` hay `docker-compose.yml`. Mọi cấu hình RUN (Docker compose, networking, ports) thuộc quyền quản lý của repo master.
2. **Không copy Botble CMS**:
   - Dịch vụ học tập *kiến trúc* của Botble CMS, tuyệt đối không sao chép mã nguồn, view hay tài nguyên từ `services/cms`.
3. **Biến môi trường**:
   - Chỉ đọc các biến môi trường có tiền tố `KEEP_*` (ví dụ `KEEP_PORT`, `KEEP_DATABASE_URL`, `KEEP_TEST_ADMIN_URL`).
   - Không đọc `DB_DATABASE` và không chạm vào database `cms_db`.
4. **Git Submodule Discipline**:
   - Luôn commit và push các thay đổi trong repo này trước, sau đó mới cập nhật commit pointer của submodule ở repo master.

## Development Scripts
- `pnpm dev`: Khởi chạy development server với watch mode qua SWC loader.
- `pnpm build`: Biên dịch TypeScript sang JavaScript trong thư mục `dist/`.
- `pnpm typecheck`: Kiểm tra kiểu tĩnh với `tsc --noEmit`.
- `pnpm test:unit`: Chạy unit tests với Vitest.
- `pnpm test:int`: Chạy integration tests với Vitest (yêu cầu MySQL thật qua `KEEP_TEST_ADMIN_URL`).
- `pnpm lint:deps`: Kiểm tra ranh giới phụ thuộc kiến trúc bằng dependency-cruiser.
