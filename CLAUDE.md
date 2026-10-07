# UI - Loyalty

Giao diện mobile cho chương trình loyalty/promotion của đối tác IB. Các trang là HTML tĩnh, chạy trong webview của app.

## Quy tắc bắt buộc

1. **Chỉ dùng giá trị từ `tokens/tokens.css`.** Không hard-code màu, spacing, font, bo góc hay kích thước component. Nếu không có token nào phù hợp, thêm token mới vào `tokens/tokens.json` rồi build lại; không viết giá trị thẳng vào trang.
2. **Khung 375px, có safe-area, chạy trong webview.** Thiết kế cho chiều rộng 375px. Chừa safe-area trên và dưới bằng `env(safe-area-inset-*)`. Không dựa vào thanh địa chỉ, hover hay tính năng chỉ có trên trình duyệt desktop.
3. **Dữ liệu chỉ lấy từ `mock/*.json`.** Không viết cứng số liệu, tên, ngày tháng hay trạng thái trong HTML. Trang đọc dữ liệu từ file mock và render ra.
4. **Mỗi trang phải chuyển được giữa các state.** Dùng query string, ví dụ `?state=capped`, để xem nhanh từng state mà không cần sửa code. Liệt kê các state trang hỗ trợ ở đầu file. Danh mục state đầy đủ nằm ở `STATES.md`, sinh từ `mock/*.json` bằng `python3 tools/build-states.py`: thêm, bớt hay sửa mô tả state thì chạy lại lệnh này.
5. **Bám theo `spec.md`.** Chỗ nào spec chưa nói thì hỏi, không tự quyết.

## Thuật ngữ

Đơn vị của chương trình là **coin** (số nhiều: coins), không gọi là point. Chỉ chữ trên giao diện đổi; tên file và tên biến (`point-balance`, `points`) giữ nguyên.

## Design token

- Nguồn chuẩn: `tokens/tokens.json`. Chỉ sửa file này.
- `tokens/tokens.css` được sinh ra từ JSON, không sửa tay. Build lại bằng `python3 tokens/build.py`.
- Light là mặc định trên `:root`; dark bật bằng `data-theme="dark"` trên phần tử gốc. Mỗi trang phải đúng ở cả hai mode.
- Giá trị gốc lấy từ Figma nhưng đã được chỉnh qua review. Không đồng bộ lại từ Figma đè lên token hiện tại.

Token theo vai trò nên dùng trước khi tìm tới primitive:

| Cần gì | Token |
|---|---|
| Nền trang (có blend màu theme) | `--surface-page` |
| Card thường | `--card-surface`, `--card-stroke`, `--card-shadow`, `--radius-card` |
| Card kính trên nền sáng | `--surface-vivid`, `--glass-surface`, `--glass-border` |
| Card theme nhạt | `--surface-brand-soft`, `--stroke-brand-soft` |
| Nền blend vivid (theme, red, yellow, lime, green, cyan, pink, indigo) | `--blend-<màu>-bg`, `-fg`, `-ink`, `--blend-stroke` |
| Chữ | `--ui-text-primary`, `-secondary`, `-tertiary`, `-disabled`, `-brand` |
| Kiểu chữ | `--font-display-m`, `--font-title-l`, `--font-title-m`, `--font-large-*`, `--font-medium-*`, `--font-small-*`, `--font-x-small-*` |
| Nút | cao `--size-control-sm/md/lg`, bo `--radius-pill`, trạng thái nhấn `--ui-button-*-pressed` |
| Field | `--ui-field-surface`, `--ui-field-surface-locked`, `--size-field`, `--radius-control` |
| Khoảng cách | `--spacing-gutter`, `--spacing-card`, `--spacing-section`, `--spacing-stack`, thang `--spacing-*` |
| Lớp phủ sau sheet, dialog | `--ui-overlay-scrim` |
| Thanh điều hướng dưới | `--ui-nav-surface`, `--ui-nav-stroke`, `--ui-nav-tab-active` |

Heading `--font-heading-h1` tới `h4` là cỡ desktop, không dùng trên mobile.

## Tham khảo element

`review/token-review.html` chứa mẫu đã duyệt của mọi element (card, nút và trạng thái, form, bộ chọn, bottom sheet, alert, badge…), ở cả light và dark. Khi cần một element, lấy kiểu dáng từ đó trước khi tự thiết kế mới. File này là trang review, không phải code sản phẩm: chỉ tham khảo cách ghép token, không sao chép nguyên CSS.

## Cấu trúc thư mục

- `spec.md`: đặc tả sản phẩm. Mục 1–8 là brief gốc; từ mục 9 là các quyết định theo thời gian, mục sau ghi đè mục trước.
- `STATES.md`: danh mục state của cả 3 trang (sinh tự động, không sửa tay).
- `tokens/`: design token và script build.
- `pages/`: mỗi trang gồm `<tên>.html`, `<tên>.js` (render) và `<tên>.css` (style riêng của trang).
- `shared/`: `base.css` (khung, font, kiểu chữ), `components.css` và `components.js` (component dùng chung), `data-source.js` (chỗ duy nhất lấy dữ liệu: mock hôm nay, API sau này), `app.js` (áp state, định dạng số và ngày), `nav.js` (thanh điều hướng dưới), `tour.js` (tour hướng dẫn 5 bước), `live-feed.js`, `date-filter.js`, `theme.js`, `icons.svg`.
- `mock/`: dữ liệu mẫu. `common.json` dùng chung; mỗi trang một file gồm `default` và `states` (mỗi state là phần ghi đè).
- `copy/en.json`: toàn bộ chữ trên UI. Không viết chữ thẳng vào trang.
- `assets/fonts/`: font woff2 đóng gói sẵn. Không dùng Google Fonts.
- `assets/images/`: hình đã thu về đúng **3 lần kích thước hiển thị lớn nhất** (đo ở màn hình 430px). Hình lớn (quà, cup) dùng WebP; icon nhỏ dùng PNG. File gốc để ở `Design Elements/`, không đưa vào web.
- `review/`: mockup review element.
- `demo/`: chỉ dùng cho bản demo, **không giao cho front-end dev**: `preview.js` (thanh chuyển state) và `intents.js` + `intents.en.json` (pop-up "Internal Explanation" khi bấm nút). Mỗi trang nạp chúng trong khối `<!-- DEMO ONLY: start … end -->` cuối file HTML. Không import code trong `demo/` từ `pages/` hay `shared/`.

## Chạy thử

Trang tải JSON nên phải chạy qua http, không mở file trực tiếp. Dùng `serve.py` thay cho `http.server` mặc định: nó tắt cache của trình duyệt, nên sửa CSS hay token xong chỉ cần tải lại trang là thấy.

```
python3 serve.py 8000
```

Rồi mở `http://localhost:8000/pages/dashboard.html`. Lần đầu mở Home trên một trình duyệt, tour hướng dẫn sẽ tự hiện; thêm `?tour=off` để tắt khi cần chụp hay kiểm tra trang. State: `?state=expiring,has-pending`. Theme: `?theme=dark|light`.

## Bản offline để gửi review

Người không vào được claude.ai xem bằng bản offline: mở thẳng từ ổ đĩa, không cần server hay mạng.

```
python3 tools/build-offline.py
```

Kết quả nằm ở `dist/hsb-loyalty-review/` và `dist/hsb-loyalty-review.zip`. Mỗi trang được gộp thành một file HTML (CSS, font, icon, script và dữ liệu mock đều nhúng vào); hình nằm trong `assets/images` bên cạnh. Trang mở đầu là `tools/offline-index.html`. Không sửa file trong `dist/`: sửa nguồn rồi chạy lại lệnh.

## Bàn giao cho front-end dev

Không gửi nguyên thư mục project. Chạy:

```
python3 tools/build-states.py && python3 tools/build-data-contract.py && python3 tools/build-handoff.py
```

Kết quả ở `dist/handoff/` và `dist/handoff.zip`: bỏ thư mục `demo/` và khối DEMO ONLY trong HTML; lệnh báo lỗi nếu còn sót code demo. Dev đọc `HANDOFF.md` trước.

Quy ước để dev (và AI của họ) convert và nhận bản cập nhật dễ:

- **Dữ liệu chỉ đi qua `shared/data-source.js`.** Không gọi `fetch` ở chỗ khác. Map API về sau là sửa file này cho trả về đúng shape trong `DATA.md`.
- **`DATA.md`** (hợp đồng dữ liệu) sinh từ mock bằng `tools/build-data-contract.py`. Thêm field vào mock thì phải thêm mô tả trong script, nếu không lệnh sẽ báo lỗi.
- **Đánh dấu trong code:** `API:` (chỗ sẽ đổi khi nối API), `PREVIEW ONLY` (chỉ phục vụ xem state), `DEMO ONLY` (thư mục `demo/`). Thêm logic giả lập mới thì ghi đúng một trong các nhãn này.
- **Giữ ổn định giữa các bản:** tên file, tên hàm, tên class CSS, key copy, giá trị `data-intent` và `data-tour`. Đổi tên là làm diff của dev phình ra.
- **Mỗi lần bàn giao:** tăng số trong `HANDOFF_VERSION`, thêm mục mới ở đầu `CHANGELOG.md` (đổi gì cho user, file nào đổi, `DATA.md`/`STATES.md` có đổi không), build, rồi gắn tag `git tag handoff-<số>`. Từ bản thứ hai, gói bàn giao tự kèm file diff so với tag trước.
