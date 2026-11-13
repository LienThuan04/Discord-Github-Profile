# PROGRESS — Discord-Github-Profile

Cập nhật: 2026-11-13 bởi Codex.

## Đang làm

- (trống) — Phase 8 hoàn tất; báo cáo đã ghi ở scratchpad `agy/phase8-report.md`.

## Trạng thái xác minh hiện tại

- `pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test --maxWorkers=1`, `pnpm.cmd build`: exit 0; **2387/2387 tests, 36 files**, gồm 421 worst-case tests. Dùng một worker để giữ RAM thấp; tsx cần normal OS do lỗi sandbox `uv_os_get_passwd ENOMEM` đã ghi trong gotchas.
- `pnpm.cmd examples --matrix-dir .verification/phase8-matrix`: exit 0; 136 SVG offline (60 theme/mode/extras + 10 showcase + 66 style/control), 4068–745963 B; thêm 300 matrix, 3357–745963 B. Cả 436 SVG qua XML/resource/dimension/budget check; integration test chặn mạng và so SHA-256 hai lần sinh.
- Effect giữ nguyên opacity, nằm dưới chữ/panel trên chat/banner/badge/compact/member; theme cao giữ nguyên overlay. Badge giữ scale/overflow crown, front layer sau pill; nền label riêng đạt contrast dark 15.50:1, light 13.31:1.
- Đã xem đủ 30 ảnh API 2× (15 theme × dark/light, kiểm tra tại 1×), Studio 1440/390, focus, live intro/loop/reduced-motion trong scratchpad `agy/phase8-out/`. Studio: 73 controls có accessible name, focus 3 px, keyboard đúng, không overflow 390 px; live không ảnh lỗi/JS exception, iframe height 639 px. Review độc lập không có phát hiện.
- Benchmark production riêng 15 theme: 30/30 HTTP 200; cold 1313–2152 ms, warm 393–538 ms, lớn nhất 761193 B, cache đúng. Badge label mới thêm 167 B (ảnh kiểm tra dark 92489 B). Chưa đo Camo công khai vì chưa có deployment/domain.
- README/wiki đủ 15 theme, 35 tham số, sources/privacy, live/iframe và Vercel. Link check exit 0: 89 local paths/anchors, 9/9 remote HTTP 200, một placeholder origin giữ nguyên. Không thêm runtime dependency.
- `python -m graphify update .`: exit 0, 1248 nodes / 3568 edges; extractor vẫn bỏ qua CSS và một số test/data không có symbol. Kiểm tra cuối: port 3103 không có listener, không còn Chrome/server QA; không đụng port 3000.

## Bước tiếp theo

- Commit đầu `da4a2ce` đã push lên `origin/main` (2026-11-13). CI lần đầu lỗi ở bước `pnpm install` (`ERR_PNPM_IGNORED_BUILDS` esbuild); đã sửa bằng `allowBuilds` trong `pnpm-workspace.yaml` (xem gotchas).
- 2026-11-13: thêm switch **Nameplate background** trong "Show on card" theo yêu cầu người dùng. Mặc định tắt; khi bật, đặt `banner_source=nameplate` để ảnh nameplate thay cho banner hồ sơ.
  - Switch chỉ hiện ở theme hỗ trợ cả `banner_source` lẫn `hide_nameplate`, và bị vô hiệu khi đang ẩn nameplate.
  - Kiểm tra: lint/typecheck 0, 2388/2388 test. Đã xem ảnh của `profile`/`nitro` và Studio.
  - Chưa commit.
- Chủ repo chọn **production domain** và **Vercel project**, rồi quyết định thời điểm ngừng deployment cũ **Profile_Discord**. Sau khi có public deployment, kiểm tra Camo thực tế; giữ `https://YOUR-DEPLOYMENT.vercel.app` đến lúc đó. Báo cáo: scratchpad `agy/phase8-report.md`; lịch sử: `docs/memory/history.md`.

## Nhật ký

- 2026-11-13 · Codex · Phase 8: offline galleries/docs, worst-case tests, short-card readability, accessibility và release QA · (chưa commit).
- 2026-11-13 · Claude · Kiểm lại phase 8: lint/typecheck/build exit 0; 2387/2387 test đạt (`--maxWorkers=2`).
  - Sửa tương phản trên art hồ sơ: `chat` có tên `--role:#fff`; chip guild tag của `chat` và `banner` dùng nền tối `#18102fcc` (light mode trước đó gần như không đọc được).
  - Sinh lại `public/examples` (136 SVG) rồi xem ảnh chat/banner extras sáng/tối · (chưa commit).
