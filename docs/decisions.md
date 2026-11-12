# Architecture Decision Records (ADRs)

## ADR-001: ESM + exports condition "development"

- **Status:** Accepted (2026-11-12)
- **Context:** NestJS 12 và Kysely 0.29 hoạt động hoàn toàn trên nền tảng ESM. Dự án cần chạy mượt mà ở cả chế độ dev/test (đọc trực tiếp `.ts` qua SWC để phản hồi nhanh) và chế độ prod (chạy `.js` đã build để tối ưu hiệu năng).
- **Decision:** Toàn bộ workspace sử dụng `"type": "module"`. Cấu hình `exports` trong `package.json` định tuyến điều kiện:
  - `"development": "./src/index.ts"` (dùng cho dev/test với `customConditions: ["development"]`)
  - `"default": "./dist/index.js"` (dùng cho production build)
- **Consequences:** Mọi relative import trong file `.ts` phải ghi rõ đuôi `.js` theo chuẩn NodeNext.

## ADR-002: Bootstrap hai giai đoạn và registry freeze

- **Status:** Accepted (2026-11-12)
- **Context:** NestJS cần biên dịch đồ thị DI và route trước khi ứng dụng khởi chạy. Tuy nhiên, plugin cần khai báo quyền, menu, hook và chạy migration trước khi route controller được mount.
- **Decision:** 
  1. Giai đoạn Pre-Nest: Core khởi tạo database, chạy core migrations, discover plugin, đọc trạng thái active, sắp xếp thứ tự nạp theo topo, nạp provider và chạy plugin migrations, sau đó gọi `register()`.
  2. Giai đoạn Nest: Tạo `CoreModule` và nạp động `PluginsHostModule` chứa controllers/providers của các plugin active. Hook `boot()` được kích hoạt trong `OnApplicationBootstrap`. Sau khi boot xong, toàn bộ registry bị freeze để ngăn mutation trong request lifecycle.
- **Consequences:** Đảm bảo an toàn bộ nhớ trong Node.js và tích hợp DI gốc của NestJS cho các plugin.

## ADR-003: Test tích hợp trên MySQL thật, mỗi test một database

- **Status:** Accepted (2026-11-12)
- **Context:** Cần kiểm thử chính xác cơ chế migration runner, advisory locks và isolation giữa các plugin mà không phụ thuộc vào mock.
- **Decision:** Test tích hợp kết nối tới MySQL thật thông qua `KEEP_TEST_ADMIN_URL`. Mỗi test suite tạo một database tạm `keep_test_<uuid>`, chạy test và drop database trong `afterEach`.
- **Consequences:** Không cần Docker-in-Docker hay Testcontainers kéo image liên tục, tốc độ chạy test nhanh và phản ánh chính xác hành vi MySQL.

## ADR-004: Chế độ source/dist cho plugin

- **Status:** Accepted (2026-11-12)
- **Context:** Plugin có thể chạy ở môi trường phát triển (raw `.ts` qua SWC) hoặc production (pre-compiled `.js` trong `dist/`).
- **Decision:** Hàm `resolvePluginFile` và `pluginMigrationsDir` tự động định tuyến đường dẫn theo biến `mode`:
  - `source`: đọc `src/provider.ts` và `database/migrations/*.ts`.
  - `dist`: đọc `dist/src/provider.js` và `dist/database/migrations/*.js`.
- **Consequences:** Code production chạy thuần Node.js không cần runtime compiler, đồng thời dev/test không cần bước build trung gian.
