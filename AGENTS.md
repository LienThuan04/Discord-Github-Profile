# AGENTS.md — Discord-Github-Profile

Discord-Github-Profile của `LianHarman(LienThuan04)`. Ứng dụng Next.js sinh card Discord presence (SVG snapshot cho GitHub README và live card qua WebSocket cho website) dựa trên dữ liệu Lanyard.
Repo: `https://github.com/LienThuan04/Discord-Github-Profile`. Branch: `main`.

## Bắt đầu phiên

1. Đọc `docs/PROGRESS.md`, rồi làm theo `docs/skills/session-handoff/SKILL.md` để đối chiếu với git.
2. Đọc `docs/PROJECT.md` trước khi sửa code hoặc cấu hình.
3. Cập nhật `docs/PROGRESS.md` ngay sau mỗi mốc, kể cả lỗi và việc chưa xong.

## Skills

| Skill | Đọc khi |
|---|---|
| `docs/skills/session-handoff/SKILL.md` | Bắt đầu phiên, xong một việc, hoặc dừng phiên. |
| `docs/skills/graphify-navigation/SKILL.md` | Tìm file/symbol/quan hệ; cập nhật graph sau thay đổi cấu trúc. |
| `docs/skills/discord-card/SKILL.md` | Chạy local, thêm/sửa theme, sinh lại `public/examples/`, chụp ảnh kiểm tra giao diện hoặc kiểm tra dung lượng SVG và thời gian tải qua Camo. |

## Bộ nhớ

- Khi gặp lỗi lạ, đọc `docs/memory/gotchas.md`; ghi nguyên nhân và cách xử lý sau khi xác minh.
- Trước khi đổi quy ước, đọc `docs/memory/decisions.md`; ghi quyết định mới và lý do.
- Nhật ký cũ chuyển sang `docs/memory/history.md` khi checkpoint dài quá ~20 dòng.

## Quy tắc

- Giao tiếp với người dùng bằng tiếng Việt. Toàn bộ nội dung dự án (code, comment, tài liệu người dùng, handoff, release notes, commit message) viết bằng tiếng Anh (trừ `AGENTS.md`, `docs/PROJECT.md`, `docs/PROGRESS.md` viết bằng tiếng Việt giống repo Spotify).
- Với câu hỏi file/symbol/quan hệ, chạy `python -m graphify query "<câu hỏi>"` (hoặc `path` / `explain`) trước khi grep/mở code, rồi mở đúng `source_file:source_location`. Nếu graph thiếu hoặc lệnh lỗi, ghi lỗi trong checkpoint rồi đọc trực tiếp các file liên quan.
- Chạy git trong repo này (`git -C <đường dẫn repo> ...` khi đứng ngoài repo).
- Commit và push chỉ khi người dùng yêu cầu rõ ràng; commit không thêm `Co-authored-by`.
- Tên tác giả hiển thị trong `README.md`, `LICENSE`, `package.json`, footer và metadata dùng đúng `LianHarman(LienThuan04)`.
- Không sao chép bất kỳ đoạn code nào từ `cnrad/lanyard-profile-readme` hay `kyrie25/lanyard-profile-readme` (chỉ được tham khảo thông tin endpoint, hash badge, palette, hành vi Discord rồi tự viết code mới).
- Trên Windows, luôn dùng `pnpm.cmd` (và `npm.cmd` nếu cần) vì PowerShell chặn `.ps1`.
