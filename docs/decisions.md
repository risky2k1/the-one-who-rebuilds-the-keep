# Architecture Decision Records (ADRs)

## ADR-001: ESM + exports condition "development"

- **Status:** Accepted (2026-11-12)
- **Context:** NestJS 12 và Kysely 0.29 hoạt động hoàn toàn trên nền tảng ESM. Dự án cần chạy mượt mà ở cả chế độ dev/test (đọc trực tiếp `.ts` qua SWC để phản hồi nhanh) và chế độ prod (chạy `.js` đã build để tối ưu hiệu năng).
- **Decision:** Toàn bộ workspace sử dụng `"type": "module"`. Cấu hình `exports` trong `package.json` định tuyến điều kiện:
  - `"development": "./src/index.ts"` (dùng cho dev/test với `customConditions: ["development"]`)
  - `"default": "./dist/index.js"` (dùng cho production build)
- **Consequences:** Mọi relative import trong file `.ts` phải ghi rõ đuôi `.js` theo chuẩn NodeNext.
