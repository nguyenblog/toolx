# 🇻🇳 ToolX: Quản Lý Đăng Ký Trả Phí (Subscription Manager) - MVP

## 💡 Tổng quan Dự án (Context)

Dự án **ToolX** nhằm giải quyết vấn đề quản lý các dịch vụ trả phí (subscriptions) và nỗi lo "auto-charge" cho người dùng tại Việt Nam. Đây là một công cụ **quản lý dịch vụ khách hàng (Customer Service Portal)** được thiết kế đặc biệt cho các doanh nghiệp bán tài khoản trả phí theo chu kỳ.

**Mục tiêu cốt lõi:**
1. **Tinh gọn:** Giữ giao diện tối giản, tập trung vào dữ liệu.
2. **Tự động hóa:** Tự động gửi cảnh báo hết hạn qua email.
3. **Cá nhân hóa:** Cho phép khách hàng tra cứu lịch sử mua hàng cá nhân.
4. **Hỗ trợ tức thì:** Tích hợp chatbot Coze AI để hỗ trợ tức thì.

---

## 🏗️ Kiến Trúc & Công Nghệ

| Thành phần | Công nghệ/Giải pháp | Vai trò |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js | Xây dựng giao diện người dùng theo phong cách ChatGPT (Sidebar + Main Content). |
| **Backend** | Node.js / Express | Xử lý Logic Nghiệp vụ, Xử lý Xác thực (OTP), Lên lịch Cron Job (Nhắc nhở). |
| **Database** | Google Sheets | **Sử dụng làm Database chính (MVP)**. Truy cập qua Google Sheets API. |
| **Hỗ trợ** | Chatbot Coze AI | Tích hợp Embed Widget vào Frontend để hỗ trợ khách hàng tự phục vụ. |

---

## 🎨 Giao diện & Thiết kế (Phong cách ChatGPT)

Để đảm bảo tính thân thiện và hiện đại, giao diện sẽ tuân thủ nghiêm ngặt phong cách tối giản của ChatGPT (Dark Mode).

| Thành phần | Màu sắc / Giá trị | Ghi chú |
| :--- | :--- | :--- |
| **Tên Dự án** | **ToolX** | Luôn hiển thị nổi bật trên Sidebar. |
| **Font Family** | **Inter** hoặc **Manrope** | Font San-Serif hiện đại, dễ đọc. |
| **Nền Sidebar** | Đen / Dark Gray (`#202123`) | Nền tối cho cột điều hướng. |
| **Nền Nội dung Chính** | Trắng / Light Gray (`#FFFFFF` hoặc `#F7F7F7`) | Nền sáng cho khu vực hiển thị dữ liệu chính. |
| **Màu Chữ Chính** | Trắng (`#FFFFFF`) trên Sidebar; Đen (`#000000`) trên Main Content. | Đảm bảo độ tương phản cao. |
| **Màu Nhấn (Primary)** | Xanh dương/Xanh lá (`#10A37F`) | Sử dụng cho nút hành động chính (Gia Hạn, Thêm Mới, Gửi Code). |
| **Màu Cảnh Báo** | Vàng (Warning) và Đỏ (Expired) | Dùng cho trạng thái dịch vụ sắp/đã hết hạn. |

---

## 🚀 Luồng Người Dùng (User Flow) Cốt Lõi

1. **Xác thực:**
    * Khách hàng truy cập Dashboard.
    * **Nhập Email** -> Nhận **Mã OTP** qua Email.
    * Nhập OTP để Verify -> Đăng nhập thành công, nhận **JWT Token**.
2. **Dashboard Cá nhân:**
    * Hiển thị Sidebar (Lịch sử, Đang hoạt động).
    * Main Content hiển thị **Tổng quan Chi phí** và **Danh sách các dịch vụ đang hoạt động**.
3. **Hành động Gia hạn/Hủy:**
    * Khách hàng nhấn **"Gia Hạn Nhanh"** bên cạnh dịch vụ.
    * Hoặc sử dụng **Chatbot Coze AI** để hỏi về quy trình gia hạn/thanh toán.

---

## ✨ Tính Năng Cốt Lõi

1. **Xác thực OTP qua Email:** (Node.js/Express + Email Service).
2. **Hệ thống Nhắc nhở Tự động (Cron Job):** Kiểm tra Sheet và gửi email cảnh báo **5 ngày** và **1 ngày** trước khi hết hạn (SMTP/Gmail).
3. **Dashboard Tra cứu Cá nhân:** Hiển thị dữ liệu riêng biệt cho từng `UserID`.
4. **Master Data (Google Sheet):** Lưu trữ URL Hủy Nhanh và thông tin dịch vụ cố định.
5. **Giao diện Giống ChatGPT:** Sidebar tách biệt, Main Content sạch sẽ, tập trung vào dữ liệu.

---

## 📋 Hướng Dẫn Coding Cho AI Agent

Vui lòng tham khảo file **`AI-Coding-Guideline.md`** để tuân thủ các quy tắc về UX/UI, naming conventions và logic code.

---

## 🧪 Demo Mode & Test Cases

- Backend mặc định chạy ở **DEMO_MODE** (đọc dữ liệu giả từ `server/data/demo-subscriptions.json`).
- Khi sẵn sàng nối data thật, đặt `DEMO_MODE=false` trong `.env` và triển khai Google Sheets API trong `googleSheetsService.js`.

### Chạy Test Backend
- Tại `server/`:
  - Cài deps: `npm install`
  - Chạy test: `npm test`
- Bộ test bao gồm:
  - `otpStore`: kiểm thử tạo/verify OTP và hết hạn.
  - `jwt`: ký/verify JWT.
  - `googleSheetsService`: lọc dữ liệu demo, tính reminder 1/5 ngày.
  - `api`: kiểm thử flow OTP end-to-end và `GET /api/subscriptions`.

### Dữ liệu demo
- Tệp: `server/data/demo-subscriptions.json` chứa nhiều dịch vụ/ trạng thái (active/warning/expired) cho các email demo.

### Cron Job (Nhắc hạn)
- Được schedule hằng ngày lúc 08:00 (bỏ qua khi chạy test).
- Có endpoint demo: `POST /api/__demo__/trigger-reminders` để kích hoạt kiểm tra nhắc hạn thủ công.

### Bật gửi email nhắc hạn qua Gmail
- Cấu hình `server/.env` (tham khảo `server/.env.example`):
  - `SMTP_USER` = Gmail của bạn
  - `SMTP_PASS` = App Password của Gmail
  - `SMTP_FROM` = tên hiển thị (ví dụ: `ToolX <your@gmail.com>`)
  - `ALERT_ENABLED=true` để bật gửi email
- Gmail App Password: https://support.google.com/accounts/answer/185833
- Khi chưa cấu hình SMTP, hệ thống sẽ log ra console thay vì báo lỗi.