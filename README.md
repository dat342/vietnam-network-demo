# Mạng lưới quan hệ doanh nhân Việt Nam — Demo "6 độ phân cách"

Web tìm **chuỗi kết nối ngắn nhất** giữa hai người, qua các thành viên Hội đồng quản trị /
Ban lãnh đạo của doanh nghiệp niêm yết. Ví dụ: muốn biết "ông A" liên hệ tới "ông D" qua những ai.

Dữ liệu lãnh đạo được cào từ **CafeF** (119 doanh nghiệp lớn nhất sàn VN, ~1.880 lãnh đạo).

---

## 1. Mở để xem (không cần cài gì)

**Double-click vào `index.html`** → mở thẳng trong trình duyệt. Chạy hoàn toàn offline,
không cần internet, không cần server. (Dữ liệu nằm sẵn trong `data.js`.)

## 2. Cách dùng

- Gõ tên 2 người vào ô **Từ người** / **Đến người** → chọn trong gợi ý → bấm **Tìm chuỗi kết nối**.
- Bấm **🎲 Thử ví dụ ngẫu nhiên** hoặc một **cặp gợi ý** bên dưới để xem ngay.
- Công tắc **"Kết nối mở rộng"**:
  - **Tắt** (mặc định): chỉ tính quan hệ **thật** — hai người cùng ngồi một HĐQT/Ban lãnh đạo.
    Chính xác, nhưng mạng lưới thưa → nhiều cặp "không có đường".
  - **Bật**: nối thêm liên kết **cùng ngành / cùng tập đoàn** (nét hồng đứt) cho mạng liền mạch.
    Chỉ để minh hoạ ý tưởng, **không** hàm ý hai người quen nhau cá nhân.
- Bấm tên trong danh sách **"cầu nối"** để đặt làm điểm bắt đầu.

---

## 3. Đăng lên GitHub Pages (có link chia sẻ)

```bash
cd ~/Desktop/vietnam-network-demo
git init
git add .
git commit -m "Demo mang luoi quan he doanh nhan VN"
# Tao repo tren GitHub roi:
git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
git branch -M main
git push -u origin main
```

Sau đó vào repo trên GitHub → **Settings → Pages → Source: `main` / root → Save**.
Vài phút sau có link dạng `https://<tên-bạn>.github.io/<tên-repo>/`.

> Demo này dùng cho mục đích cá nhân/minh hoạ. Nếu công bố công khai, cân nhắc gỡ `data.js`/`data.json`
> hoặc chỉ để repo ở chế độ **private** (GitHub Pages private cần tài khoản trả phí).

---

## 4. Cào lại / cập nhật dữ liệu

```bash
python3 scrape.py     # cào ban lãnh đạo từ CafeF -> data.json
python3 enrich.py     # gắn ngành + tập đoàn, xuất data.js cho web
```

Sửa danh sách công ty trong `SYMBOLS` (file `scrape.py`) để thêm/bớt doanh nghiệp.

---

## Cấu trúc thư mục

| File | Vai trò |
|------|---------|
| `index.html` | Giao diện web |
| `style.css` | Định dạng |
| `app.js` | Logic tìm đường (BFS) + vẽ chuỗi |
| `data.js` | **Dữ liệu** web đọc (sinh từ `enrich.py`) |
| `data.json` | Dữ liệu thô (để xem/tra cứu) |
| `scrape.py` | Script cào CafeF |
| `enrich.py` | Gắn ngành/tập đoàn, xuất `data.js` |

---

## Lưu ý về dữ liệu & pháp lý

- "Quen biết" ở đây **suy ra từ việc cùng ngồi HĐQT/Ban lãnh đạo** — thông tin **công khai**,
  kiểm chứng được trên báo cáo doanh nghiệp; **không** phải quan hệ cá nhân riêng tư.
- Dữ liệu lấy từ CafeF cho mục đích **demo, không công bố công khai**.
- Nếu sau này muốn làm sản phẩm thật cho nhiều người dùng, cần xem lại điều khoản nguồn dữ liệu
  và quy định bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
