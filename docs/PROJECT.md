# Discord-PULSE — Profile User Live Status Engine (Discord Presence Card & Card Studio)

- Repo: `github.com/LienThuan04/Discord-Github-Profile` (branch **`main`**), phát triển và duy trì bởi `LianHarman(LienThuan04)`. Giấy phép: `LICENSE` (MIT).
- Deploy: Vercel project `discord-pulse` (team `lien-hoa-thuans-projects`), alias production `https://discord-pulse-lian.vercel.app`. Tài liệu người dùng trỏ host này; self-hosters thay bằng origin của họ.
- Deploy thứ hai: Cloudflare Workers qua OpenNext (`wrangler.jsonc`, `open-next.config.ts`), Worker `discord-pulse`. Hướng dẫn đầy đủ cho mọi app Next.js kèm bảng lỗi đã gặp: `docs/DEPLOY-CLOUDFLARE.md` (tag `cloudflare-deploy-guide`).
- Stack: Next.js 16.4.6 (App Router, `src/`), React 19.3.1, TypeScript 6.0.3 (strict), Zod 4.6.7, CSS Modules + CSS variables (không Tailwind, không UI kit), Vitest 4.1.12, ESLint 9 flat config, pnpm 11.22.0.

## Routes (`src/app/`)

| Route | File | Việc |
|---|---|---|
| `/` | `src/app/page.tsx` | **Card Studio**: nhập Discord ID (mặc định demo `983724520789655613`), xem preview Live (WebSocket) hoặc SVG, chọn theme/tuỳ chọn và copy mã nhúng (Markdown, HTML, `<picture>`, Live iframe, SVG URL). |
| `/api/[id]` | `src/app/api/[id]/route.ts` | Render card **SVG** (`image/svg+xml; charset=utf-8`, HTTP 200 kể cả khi lỗi ID/chưa vào server Lanyard) cho GitHub README. Card đầy đủ cache `s-maxage=30, stale-while-revalidate=3600`; card thiếu (profile/art vượt budget hoặc lỗi, Lanyard lỗi) chỉ cache `s-maxage=5`, không SWR. Phần tải dở được chạy tiếp bằng `after()` (`src/lib/cache-policy.ts`). |
| `/api/[id]/profile` | `src/app/api/[id]/profile/route.ts` | JSON profile extras cho Studio/live, cùng chính sách cache như trên. |
| `/live/[id]` | `src/app/live/[id]/page.tsx` | Render **Live card** nền trong suốt cho website/iframe; tự cập nhật qua Lanyard WebSocket và gửi chiều cao bằng `postMessage({ type: "dgp:height", height })`. |

## Luồng dữ liệu

```
Lanyard REST / WebSocket ──► normalize(presence, { now }) ──► CardData (view model thuần)
URL query params ──────────► parseOptions() / parseCardOptions() ──► CardOptions (Zod, mặc định, clamp)
                                        │
                       <Theme.Component data options assets error target />
                         │                                             │
  SVG target (`/api/[id]`):                              Live target (`/live/[id]` & Studio):
  - Thu thập URL ảnh qua render pass đầu                 - `useLanyard(id)` nối WebSocket Lanyard
    (kèm fallback tĩnh cho ảnh động)                       (op 1 Hello → op 2 Subscribe → op 3 Heartbeat,
  - `inlineAssets()` tải song song (6 worker,              probe khi im lặng ≥90s, quá 5 lỗi chuyển sang
    kiểm tra HTTPS/DNS/IP/MIME, giới hạn dung lượng)       REST polling 30s và thử lại WS sau 5 phút)
  - `renderToStaticMarkup` (`react-dom/server.edge`)     - Đồng hồ JS cập nhật `now` mỗi giây
    bọc trong `<svg><foreignObject><div xmlns=xhtml>`    - Dùng trực tiếp `directAssets` (hỗ trợ `<video>`
  - Đồng hồ & thanh tiến trình chạy bằng CSS `steps()`     nameplate `.webm` khi `animated=true`)
```

## Themes (`src/card/themes/` & `src/card/theme-registry.ts`)

Có 16 theme, mỗi theme đều hỗ trợ `mode=dark|light`, hàm `measure(data, options, error)` tất định và CSS đóng gói riêng:

| Theme | Kích thước | Mục đích |
|---|---|---|
| `profile` (mặc định) | Rộng 300–600 (mặc định 420), cao theo nội dung | Phong cách Discord profile popout: banner (KV banner → nameplate → gradient), avatar + decoration, trạng thái, tên hiển thị, `@username`, guild tag, badges, custom status, thiết bị, KV bio/pronouns/location/website, các activity và Spotify. |
| `nitro` | Rộng 300–600, cao theo nội dung | Nền indigo với lưới chuyển màu Blurple–violet–magenta chuyển động, tên in hoa lớn, vòng sáng quanh avatar, đầy đủ các mục như `profile`. |
| `member` | Rộng clamp 360–420, cao cố định 96 | Hàng danh sách thành viên Discord với nền nameplate tĩnh, avatar + decoration tĩnh, tên, guild tag và 1 dòng tóm tắt trạng thái/hoạt động. |
| `compact` | Rộng 300–600, cao cố định 68 | Dải ngang gọn cho README hẹp: avatar tĩnh (bỏ decoration), tên, chấm trạng thái và 1 dòng tóm tắt hoạt động. |
| `activity` | Rộng 300–600, cao theo nội dung | Đặt hoạt động hiện tại hoặc Spotify lên đầu với ảnh bìa lớn, tiêu đề/chi tiết và đồng hồ/thanh tiến trình; header nhận diện nhỏ gọn. |
| `glass` | Rộng 300–600, cao theo nội dung | Các khung kính mờ (`backdrop-filter: blur`) đặt trên nền ảnh banner/nameplate/avatar làm mờ; đầy đủ các mục. |
| `badge` | Rộng tự tính theo văn bản (`Courier New`), cao 32 | Huy hiệu nhỏ kiểu shields: avatar tuỳ chỉnh 20px (nếu có), chấm trạng thái và văn bản hoạt động/trạng thái. |

Chi tiết hợp đồng kỹ thuật khi thêm hoặc sửa theme nằm ở `docs/THEME-CONTRACT.md` và quy trình ở `docs/skills/discord-card/SKILL.md`.

Ngoài bảy theme nền tảng ở bảng trên, registry còn có `chat`, `banner`, `terminal`, `neon`, `retro`, `polaroid`, `mobile`, `voice`, `wave`. Theme `wave` dựng lại card cũ của chủ repo: header nền nameplate, khối "nước" gợn sóng, màu theo `wave_color` (`auto` lấy màu của app đang chạy). Theme banner rộng 600–1000px, mặc định 800; Studio dùng cùng `THEME_WIDTHS`.

Profile extras được hiển thị qua `src/card/parts/profile-look.tsx`: banner/nền, surface Nitro, effect tĩnh trong SVG và APNG có lịch phát trong live, gộp badge và fallback bio/pronouns. Cả 15 theme bật `usesProfile`; frame type 3 được bọc chung ở registry và tăng canvas theo overflow. `width` vẫn là chiều rộng card gốc. `/api/[id]/profile` cung cấp JSON có cache cho Studio; trang Studio warm/seed profile song song với Lanyard, còn live bổ sung profile khi seed server chưa có đủ effect. Hai route API dùng `lookupProfileExtras()` (`{ profile, complete, settled }`) để biết kết quả đã đủ chưa; `fetchProfileExtras()` chỉ trả `profile`. Thứ tự ưu tiên cho khung và hiệu ứng: (1) dstn trả kịp budget, (2) Lanyard KV `profile_effect`/`profile_frame` (SKU hoặc `none`; mọi nơi gọi truyền `declared: presence.then(presenceCosmetics)`), (3) bản tốt gần nhất trong kho. Studio có ô **Keep your frame and effect** (`src/components/studio/CosmeticsLock.tsx`, `cosmeticCommands()` trong `src/lib/studio-controls.ts`) hiện lệnh `/set` để copy. Lý do: instance lạnh trên Vercel thường vượt budget 1,5 s, và card thiếu art từng bị CDN giữ tới 1 giờ (xem `docs/memory/decisions.md`). `banner_source`, `hide_effect`, `hide_frame`, `tz` có control theo theme; clock chat/mobile và date polaroid theo múi giờ IANA.

## Query params

Icon ứng dụng là `public/brand/icon.svg`, đồng thời là favicon `src/app/icon.svg` (hai file phải giống hệt nhau) và logo `Mark` trong Studio. Đây là artwork gốc lấy cảm hứng từ avatar của chủ repo: ngọn lửa vũ trụ, vòng cổ có ba mũi nhọn, sao bốn cánh và chấm presence xanh. Icon không mô phỏng logo Discord. Script sinh icon nằm ngoài repo; muốn sửa thì chỉnh trực tiếp SVG.

Card Studio có ô **Coming soon** và link góp ý ở footer, cả hai trỏ tới `FEEDBACK_URL` (server-side, mặc định là GitHub của chủ repo; `.env` local đặt `https://lianharman.netlify.app`).

Toàn bộ 37 tham số query dạng `snake_case` được định nghĩa tại `src/lib/options.ts` (`OPTION_NAMES`) và ánh xạ theo từng theme qua `supportedParams` trong `src/card/theme-registry.ts`. Bảng tra cứu đầy đủ kiểu dữ liệu, khoảng giá trị, mặc định và hiệu ứng nằm ở mục **Options** trong `wiki/Home.md`.

## Env (`.env` ở gốc repo, mẫu: `.env.example`)

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `LANYARD_API_URL` | `https://api.lanyard.rest/v1` | Endpoint REST phía server (`/users/{id}` được nối thêm). Đổi khi tự host Lanyard. |
| `NEXT_PUBLIC_LANYARD_WS_URL` | `wss://api.lanyard.rest/socket` | Endpoint WebSocket phía trình duyệt cho Live card và Studio (kiêm suy ra URL REST polling dự phòng). |
| `NEXT_PUBLIC_SITE_URL` | `(trống)` | Origin công khai dùng để sinh mã nhúng trong Studio; khi để trống sẽ tự lấy theo origin của request hiện tại. |
| `DISCORD_BOT_TOKEN` | `(trống)` | Tuỳ chọn, chính thức: bật `GET /api/v10/users/{id}` (banner, `accent_color`) cho `CardData.profile`. Chỉ dùng phía server. |
| `DISCORD_PROFILE_PROVIDER` | `dstn` | Mirror hồ sơ **không chính thức** `dcdn.dstn.to` (bio, pronouns, theme colors, profile effect, toàn bộ badge); `off` để tắt. |
| `DISCORD_PROFILE_PROVIDER_URL` | `(trống → https://dcdn.dstn.to)` | Base URL của mirror tương thích dstn (`{url}/profile/{id}`). |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) | `(trống)` | Kho Upstash Redis lưu "bản tốt gần nhất" của từng user (`src/lib/discord/profile-store.ts`). Có kho thì cold start hay dstn chết vẫn giữ được khung/hiệu ứng/badge. Trên Vercel: Marketplace → Upstash for Redis → nối vào project. Chỉ dùng phía server. |
| `PROFILE_STORE` | `(trống)` | `off` để bỏ qua kho. |

Trên Cloudflare, biến runtime không bí mật nằm trong `vars` của `wrangler.jsonc`, vì mỗi lần deploy sẽ ghi đè biến thường đặt trên dashboard. `DISCORD_BOT_TOKEN` đặt làm Secret, còn `NEXT_PUBLIC_*` là build variable.

## Lệnh (Windows dùng `pnpm.cmd`)

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev          # http://localhost:3000
pnpm.cmd lint         # ESLint
pnpm.cmd typecheck    # tsc --noEmit
pnpm.cmd test         # Vitest (2557 tests / 43 files); thêm --maxWorkers=1 khi ít RAM
pnpm.cmd build        # Next.js production build
pnpm.cmd examples     # Sinh 136 SVG offline + gallery style + index.html + manifest.json
pnpm.cmd run preview  # Build OpenNext rồi chạy Worker ở http://localhost:8787 (Windows cần bật Developer Mode)
pnpm.cmd run deploy   # Build OpenNext rồi deploy lên Cloudflare (cần `wrangler login`)
```

## Bố cục thư mục

- `src/app/` — App Router: `/` (Card Studio), `/live/[id]` (Live card), `/api/[id]` (SVG API route).
- `src/components/studio/` — Giao diện và logic của Card Studio (`CardStudio.tsx`, `CardStudio.module.css`).
- `src/live/` — Client wrapper cho Live card (`LiveCard.tsx`, tự co giãn theo khung và gửi `dgp:height`).
- `src/hooks/useLanyard.ts` — React hook dùng `useSyncExternalStore` nối với store Lanyard.
- `src/card/` — `theme-registry.ts`, `types.ts`, `parts/` (các thành phần dùng chung: identity, activity, clock, theme-kit) và `themes/` (16 theme).
- `src/lib/lanyard/` — Kiểu dữ liệu, schema Zod, client REST (`client.ts`), hàm chuẩn hoá `normalize.ts`, và máy trạng thái WebSocket/polling (`socket.ts`).
- `src/lib/discord/` — Hàm tạo URL CDN Discord/Spotify/YouTube/Twitch/Twemoji, giải mã bitfield badges, bảng màu nameplate, tính thời gian và xử lý màu.
- `src/lib/svg/` — Trình tải và nhúng ảnh base64 có kiểm tra bảo mật (`assets.ts`), trình kết xuất SVG tĩnh (`render.tsx`).
- `src/lib/options.ts` & `src/lib/embed.ts` — Bộ phân tích query params và bộ tạo URL/mã nhúng.
- `src/lib/cache-policy.ts` — Hai chuỗi `Cache-Control` (đầy đủ / thiếu) và `finishAfterResponse()` bọc `after()` của Next.
- `scripts/` — `generate-examples.ts`, `example-data.ts`, `screenshot-examples.ps1`.
- `public/examples/` — 136 SVG tất định, sinh offline từ fixture và asset đã đóng gói: 60 theme/mode/extras, 10 showcase, 66 style/control. Manifest lưu kích thước và byte; generator chặn XML lỗi, URL ảnh ngoài và SVG ≥1 MB.
- `tests/` — 43 file kiểm thử Vitest và bộ `tests/fixtures/` (bản chụp JSON đã làm sạch cùng fixture tổng hợp, asset gallery đóng gói). Có 421 worst-case tests và kiểm tra generator không dùng mạng, SHA-256 hai lần sinh giống nhau.

## Tài liệu người dùng

`README.md` có giới thiệu, quick start, ảnh của đủ 16 theme, bảng 37 tham số thu gọn, live iframe, nguồn dữ liệu/privacy và triển khai Vercel. `wiki/Home.md` giữ tài liệu chi tiết trên **một trang duy nhất** có mục lục: kích thước và control từng theme, gallery dark/light và style, Card Studio, live/iframe resize, Lanyard KV qua bot `/set`, self-host, cache/Camo, xử lý sự cố và phát triển. Cập nhật cả hai bảng tham số khi thay đổi contract. Kiểm tra link và ảnh bằng `python scripts/check-doc-links.py --remote`.

Tab Wiki trên GitHub (`Discord-Github-Profile.wiki.git`, branch `master`) là bản sao của `wiki/`, làm giống repo Spotify.

**Quy tắc link:**
- README trỏ sang tab Wiki (`https://github.com/LienThuan04/Discord-Github-Profile/wiki#...`).
- Trong `wiki/Home.md` không dùng link tương đối `../`. File trong repo dùng `.../blob/main/<path>`, ảnh dùng `.../raw/main/<path>`. Link nội bộ trong trang là anchor `#...`.
- Script kiểm tra link đối chiếu các URL này với checkout local, vì repo có thể đang private.

**Cách đồng bộ:**
1. Sửa `wiki/Home.md` trước.
2. Clone kho wiki và chép đè `Home.md`. Giữ nguyên `_Sidebar.md`/`_Footer.md`; khi thêm hoặc bớt mục lớn thì sửa mục lục trong `_Sidebar.md`.
3. Commit và push kho wiki (chỉ khi người dùng yêu cầu push).
