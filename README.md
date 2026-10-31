# Điểm danh bằng QR

Ứng dụng gồm website đăng ký, mã QR cá nhân, màn hình quét camera và dữ liệu CSV lưu điểm danh. Cùng một giao diện có thể chạy trên web hoặc được đóng gói thành ứng dụng Android bằng Capacitor.

## Chạy trên máy

Yêu cầu Node.js 22+.

```bash
npm install
copy .env.example .env
npm run dev
```

- Website: `http://localhost:5173`
- API: `http://localhost:3001`
- Danh sách đăng ký được lưu tại `data/students.csv`
- Lịch sử điểm danh được lưu tại `data/attendance.csv`

Hãy đổi `QR_SECRET` trong `.env` trước khi dùng thật. Không đổi secret sau khi đã phát QR vì các QR cũ sẽ không còn hợp lệ.

Đặt mã số quản trị dùng để mở camera và dữ liệu:

```env
ADMIN_PASSWORD=246810
```

Hãy thay mã ví dụ này trước khi triển khai. Để mở thanh quản trị, nhập mã số vào ô **Họ và tên** của biểu mẫu. Khi mã đúng, thanh điều hướng camera và dữ liệu sẽ xuất hiện. Mật mã được kiểm tra tại server; camera, danh sách, thống kê và tải CSV đều không thể truy cập nếu thiếu hoặc nhập sai mã.

## Tạo ứng dụng Android

Android app cần gọi được đến server API qua HTTPS. Đặt URL public vào `.env`:

```env
VITE_API_URL=https://ten-mien-api-cua-ban.vn
```

Sau đó:

```bash
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio sẽ mở project để chạy trên máy thật hoặc tạo APK/AAB. Camera được sử dụng qua WebView và trình duyệt sẽ yêu cầu quyền ở lần đầu quét.

## Luồng dữ liệu

1. Người dùng điền form. Server tạo UUID, lưu hồ sơ vào CSV và ký UUID bằng HMAC-SHA256.
2. QR chỉ chứa phiên bản, UUID và chữ ký; không chứa họ tên, tuổi hoặc lớp.
3. Máy quét gửi token đến API. API xác thực chữ ký rồi ghi điểm danh.
4. Server kiểm tra file CSV để không cho một người điểm danh hai lần trong cùng ngày.

## API chính

- `POST /api/students` — đăng ký và nhận ảnh QR.
- `POST /api/attendance/scan` — xác thực QR và ghi điểm danh.
- `GET /api/attendance/today` — danh sách điểm danh hôm nay.
- `GET /api/stats` — số người đăng ký và có mặt.
- `GET /api/export/students.csv` — tải danh sách đăng ký dạng CSV.
- `GET /api/export/attendance.csv` — tải lịch sử điểm danh dạng CSV.
