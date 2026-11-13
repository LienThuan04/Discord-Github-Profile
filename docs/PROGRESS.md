# PROGRESS — Discord-Github-Profile

Cập nhật: 2026-11-13 bởi Claude Code.

## Đang làm

- Phase 9 đang triển khai: theme `wave`, màu theo ứng dụng, URL cũ và Studio. Git sạch tại `e5c9c07`; không commit/push. Kế hoạch: `docs/superpowers/plans/2026-11-13-wave.md`. Parser/mặc định/legacy đã triển khai test-first (22 test đỏ ban đầu), bộ lọc ID và Studio switch đã qua 38/38 test phạm vi. Hai test wave còn chờ đăng ký theme. Đang thêm gallery/tài liệu và chờ layout; tiếp theo chạy toàn bộ QA theo `phase9.md`. Graph cũ có node `presence-kit.tsx` không còn tồn tại; đã đọc các part thực tế, sẽ update graph cuối phiên.

## Trạng thái xác minh hiện tại

- `pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test --maxWorkers=1`, `pnpm.cmd build`: exit 0; **2387/2387 tests, 36 files**, gồm 421 worst-case tests. Dùng một worker để giữ RAM thấp; tsx cần normal OS do lỗi sandbox `uv_os_get_passwd ENOMEM` đã ghi trong gotchas.
- `pnpm.cmd examples --matrix-dir .verification/phase8-matrix`: exit 0; 136 SVG offline (60 theme/mode/extras + 10 showcase + 66 style/control), 4068–745963 B; thêm 300 matrix, 3357–745963 B. Cả 436 SVG qua XML/resource/dimension/budget check; integration test chặn mạng và so SHA-256 hai lần sinh.
- Effect giữ nguyên opacity, nằm dưới chữ/panel trên chat/banner/badge/compact/member; theme cao giữ nguyên overlay. Badge giữ scale/overflow crown, front layer sau pill; nền label riêng đạt contrast dark 15.50:1, light 13.31:1.
- Đã xem đủ 30 ảnh API 2× (15 theme × dark/light, kiểm tra tại 1×), Studio 1440/390, focus, live intro/loop/reduced-motion trong scratchpad `agy/phase8-out/`. Studio: 73 controls có accessible name, focus 3 px, keyboard đúng, không overflow 390 px; live không ảnh lỗi/JS exception, iframe height 639 px. Review độc lập không có phát hiện.
- Benchmark production riêng 15 theme: 30/30 HTTP 200; cold 1313–2152 ms, warm 393–538 ms, lớn nhất 761193 B, cache đúng. Badge label mới thêm 167 B (ảnh kiểm tra dark 92489 B). Chưa đo Camo công khai vì chưa có deployment/domain.
- README/wiki đủ 15 theme, 35 tham số, sources/privacy, live/iframe và Vercel. Link check exit 0: 89 local paths/anchors, 9/9 remote HTTP 200, một placeholder origin giữ nguyên. Không thêm runtime dependency.
- `python -m graphify update .`: exit 0, 1248 nodes / 3568 edges; extractor vẫn bỏ qua CSS và một số test/data không có symbol. Kiểm tra cuối: port 3103 không có listener, không còn Chrome/server QA; không đụng port 3000.

## Bước tiếp theo

- 2026-11-13: **sửa lỗi card production lúc có lúc mất khung/hiệu ứng hồ sơ** (tag `v1.0.2`; trên remote đã có `v1.0.1` của chủ repo ở `ecacfa2`).
  - Nguyên nhân: instance lạnh vượt budget 1,5 s nên render thiếu art; CDN giữ bản thiếu theo `stale-while-revalidate=3600`; host serverless có thể đóng băng request đang tải dở.
  - Sửa: `lookupProfileExtras()` trả `{ profile, complete, settled }`; `src/lib/cache-policy.ts` (`SNAPSHOT_CACHE`, `PARTIAL_CACHE`, `finishAfterResponse` dùng `after()`); `/api/[id]` và `/api/[id]/profile` cache ngắn `s-maxage=5` cho bản thiếu và khi Lanyard lỗi tạm thời; catalog lỗi chỉ cache 1 phút.
  - Kiểm: lint/typecheck/build 0, 2557/2557 test (43 file). Chạy `next start` với mirror giả chậm 2,5 s: lần đầu `null` + `s-maxage=5`, 3 s sau đủ Sakura + Crystals + SWR, mirror chỉ bị gọi 1 lần; SVG wave 706 KB, 10 ảnh.
  - Tài liệu: wiki (Caching, Troubleshooting), THEME-CONTRACT, PROJECT, decisions, gotchas.
  - Deploy của `e04fee6` lỗi `NEXT_NO_VERSION`: `virtualStoreDir: .verification/pnpm-virtual` nằm ngoài `node_modules`, nên build cache của Vercel khôi phục link gãy; bản tốt trước đó chạy không dùng cache. Sửa bằng 2 commit: `dc427bb` bỏ `virtualStoreDir`, nhưng vẫn lỗi vì pnpm tin file state; `d88cb6d` thêm `optimisticRepeatInstall: false` (đã tái hiện và kiểm trên bản clone). Deploy `6v8b0j0ol` Ready trong 47 s; production đủ Sakura + Crystals (wave 706 KB, README 172 KB, 10 ảnh).
  - Còn chờ người dùng: tag `v1.0.2` đang ở `e04fee6` (commit đó không build được trên Vercel khi có cache). Auto mode chặn việc dời tag sang `d88cb6d` và chặn tạo GitHub Release; nội dung release đã viết sẵn trong scratchpad của phiên Claude (`release-body.md`).

- 2026-11-13: **thêm deploy Cloudflare Workers qua OpenNext.**
  - Người dùng tự làm theo hướng dẫn; Claude kiểm tra rồi dọn ghi chú trong `pnpm-workspace.yaml`.
  - Gồm `@opennextjs/cloudflare` 1.20.16, `wrangler` 4.160.1, `allowBuilds.workerd`, `wrangler.jsonc` (Worker `discord-github-profile`, `vars` có `FEEDBACK_URL=https://lian.harmanit.workers.dev`), `open-next.config.ts` mặc định, 4 script, ignore cho `.open-next`/`.wrangler`/`.dev.vars`, và `docs/DEPLOY-CLOUDFLARE.md`. Tag: `cloudflare-deploy-guide`.
  - Kiểm trên bản sao sạch: frozen install bằng pnpm 11 OK, typecheck/lint 0, build OK. Bước đóng gói OpenNext lỗi `EPERM symlink` vì Windows chưa bật Developer Mode.
  - Chưa tạo Worker trên dashboard: địa chỉ workers.dev hiện trả 404.
  - Người dùng đổi tên phụ workers.dev của tài khoản từ `lianharman` sang **`harmanit`**. Portfolio giờ ở `https://lian.harmanit.workers.dev`, Worker này sẽ ở `https://discord-github-profile.harmanit.workers.dev`. Đã sửa `FEEDBACK_URL` và tài liệu, rồi chuyển tag `cloudflare-deploy-guide` sang commit mới.

- Commit đầu `da4a2ce` đã push lên `origin/main` (2026-11-13). CI lần đầu lỗi ở bước `pnpm install` (`ERR_PNPM_IGNORED_BUILDS` esbuild); đã sửa bằng `allowBuilds` trong `pnpm-workspace.yaml` (xem gotchas).
- 2026-11-13: thêm switch **Nameplate background** trong "Show on card" theo yêu cầu người dùng. Mặc định tắt; khi bật, đặt `banner_source=nameplate` để ảnh nameplate thay cho banner hồ sơ.
  - Switch chỉ hiện ở theme hỗ trợ cả `banner_source` lẫn `hide_nameplate`, và bị vô hiệu khi đang ẩn nameplate.
  - Kiểm tra: lint/typecheck 0, 2388/2388 test. Đã xem ảnh của `profile`/`nitro` và Studio.
  - Đã push trong `a321cf3`.
- 2026-11-13: đồng bộ tab Wiki giống repo Spotify: `Home.md`, `_Sidebar.md` và `_Footer.md` đã push lên `Discord-Github-Profile.wiki.git`. README trỏ sang tab Wiki; `wiki/Home.md` dùng URL tuyệt đối; link checker đối chiếu URL repo/wiki với checkout local.
- 2026-11-13: thêm theme thứ 16 **`wave`**, dựng lại card cũ của chủ repo.
  - Bố cục: header nền nameplate; khối "nước" gợn sóng dâng lên.
  - Tham số `wave_color=auto|hex`. `auto` chọn màu theo thứ tự: Spotify xanh, màu thương hiệu app, màu lấy từ ảnh hoạt động, rồi màu banner hồ sơ.
  - Tham số `ignore_app_id`. `THEME_DEFAULTS` (member/wave dùng nameplate). Map tham số URL cũ (`theme=dark`, `imgStyle`, `ignoreAppId`…).
  - Ai làm gì:
    - Codex viết phần chính rồi hết quota. agy Opus làm tiếp rồi cũng hết quota.
    - Claude khôi phục phần tử khối nước bị mất; bỏ hộp tối che nameplate; làm nhạt lớp phủ header.
    - Claude đưa header và khối nước về một stacking context, để hiệu ứng hồ sơ hiện trên ảnh nameplate nhưng dưới chữ.
    - Claude cập nhật README, wiki, contract và PROJECT.
  - Kiểm tra: lint/typecheck/build 0; 2521/2521 test (39 file); 144 example; link check 0 lỗi. Đã xem ảnh: so với card cũ, sáng/tối, `wave_color`, Studio, live.
  - Chưa commit.
- 2026-11-13 (tiếp): làm `wave` giống card cũ hơn.
  - Chữ trắng trên các màu trung tính như xanh Spotify; đổi sang chữ đen khi nền sáng. Ngưỡng tương phản trắng là 2,4.
  - Thanh tiến trình nằm một hàng: thời gian đã chạy, thanh, tổng thời gian.
  - Ảnh nền nameplate phủ cả header lẫn khối About, nên sóng luôn dâng lên trên ảnh.
  - Chip guild tag và badge nằm ngay sau tên; mặc định ẩn hàng thiết bị (`THEME_DEFAULTS.wave.hide_platforms`).
- 2026-11-13: biểu tượng trạng thái giống Discord (`src/card/parts/status-glyph.tsx`).
  - Trực tuyến: chấm xanh. Chờ: trăng khuyết vàng. Không làm phiền: chấm đỏ có vạch. Ngoại tuyến: vòng xám rỗng. Chỉ trên điện thoại: hình điện thoại xanh.
  - Áp dụng cho chấm ở avatar và các chấm nhỏ `mini/badge/note/polaroid/term`.
  - Budget CSS mặc định nâng lên 1400 ký tự.
- 2026-11-13: ô **Coming soon** ở lưới theme và link "Suggest a theme or feature" ở footer, cả hai trỏ tới `FEEDBACK_URL`.
  - `src/lib/feedback.ts`: biến server-side, mặc định là GitHub của chủ repo; `.env` local đặt `https://lianharman.netlify.app`.
  - README và wiki có mục "Feedback and ideas".
- 2026-11-13: cột xem trước trong Studio dính theo khi cuộn (`.previewColumn{position:sticky;top:20px}`), dừng ngang "Style it your way". Dưới 800px trở lại `static`. Đã xác nhận bằng CDP: `previewTop=20` khi `scrollY=1534` và `2043`.
- Kiểm tra: lint/typecheck/build 0; test và link check đều xanh; đã xem ảnh.
- Commit và push cùng đợt 13/11. Theo yêu cầu rõ ràng của người dùng, commit này có `Co-authored-by: DanGuangLT <phatmcpack@gmail.com>`, ngoại lệ so với quy tắc mặc định "không thêm Co-authored-by".
- 2026-11-13: icon ứng dụng mới `public/brand/icon.svg` thay favicon `src/app/icon.svg` và logo `Mark` của Studio (dùng `next/image`, `unoptimized`). Có test `tests/brand.test.tsx`.
  - Thiết kế gốc lấy cảm hứng từ avatar của chủ repo: ngọn lửa vũ trụ 3 lưỡi, vòng cổ 3 mũi nhọn, sao bốn cánh, chấm presence xanh.
  - README và wiki hiện icon ở đầu trang; README có thêm mục "Icon".
  - Push cùng đợt với wiki, theo yêu cầu người dùng.
- Chủ repo chọn **production domain** và **Vercel project**, rồi quyết định thời điểm ngừng deployment cũ **Profile_Discord**. Sau khi có public deployment, kiểm tra Camo thực tế; giữ `https://YOUR-DEPLOYMENT.vercel.app` đến lúc đó. Báo cáo: scratchpad `agy/phase8-report.md`; lịch sử: `docs/memory/history.md`.

## Nhật ký

- 2026-11-13 · Codex · Phase 8: offline galleries/docs, worst-case tests, short-card readability, accessibility và release QA · (chưa commit).
- 2026-11-13 · Claude · Kiểm lại phase 8: lint/typecheck/build exit 0; 2387/2387 test đạt (`--maxWorkers=2`).
  - Sửa tương phản trên art hồ sơ: `chat` có tên `--role:#fff`; chip guild tag của `chat` và `banner` dùng nền tối `#18102fcc` (light mode trước đó gần như không đọc được).
  - Sinh lại `public/examples` (136 SVG) rồi xem ảnh chat/banner extras sáng/tối · (chưa commit).
