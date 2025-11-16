# AI AGENT CODING & PROMPT ENGINEERING GUIDELINES (React/Node.js)

## 1. UX/UI & FRONTEND (React/Next.js) RULES

### 1.1 Giao diện (Theme & Style)
* **Font Family:** Sử dụng font **Inter** hoặc **Manrope** (hoặc một font San-Serif hiện đại, tối giản).
* **Tông Màu:**
    * **Background:** Nền trắng/xám nhạt (#FAFAFA) cho Main Content. Nền tối (Dark Gray #202123) cho Sidebar.
    * **Màu Nhấn (Primary Color):** Xanh dương (#10A37F, tone của OpenAI) hoặc Tím (tone hiện đại).
    * **Màu Cảnh Báo:** Vàng nhạt cho mục sắp hết hạn (5 ngày), Đỏ cho mục đã hết hạn.
* **Thành phần:**
    * **Sidebar:** Phải giống hệt cấu trúc Sidebar của ChatGPT (tối, các mục list item có hover mượt mà).
    * **Cards/List:** Phải rất sạch sẽ, sử dụng nhiều **Whitespace** (khoảng trắng) theo phong cách Cal.com. Dữ liệu phải là trung tâm.
    * **Buttons:** Nút hành động chính (Gia Hạn) phải dùng Primary Color, góc bo tròn nhẹ (rounded-md).

### 1.2 Component Naming Convention (Frontend)
* **Thư mục Components:** Phải chia thành `/ui` (đơn giản, Button, Input) và `/app` (logic, SubscriptionCard, AuthModal).
* **Tên File:** Phải dùng **PascalCase** (ví dụ: `SubscriptionCard.jsx`, `TotalCostHeader.jsx`).
* **Tên Prop:** Phải dùng **camelCase** (ví dụ: `onSubscriptionClick`, `hasError`).

## 2. BACKEND & LOGIC (Node.js/Express) RULES

### 2.1 Cấu trúc & Naming Convention (Backend)
* **Tên File:** Phải dùng **camelCase** hoặc **kebab-case** (ví dụ: `authController.js`, `reminder-service.js`).
* **Tên Biến/Hàm:** Phải dùng **camelCase** (ví dụ: `calculateNextBillingDate`, `requestOtpCode`).
* **Tên Model/Schema (Nội bộ):** Phải dùng **PascalCase** (ví dụ: `UserSchema`, `SubscriptionModel`).

### 2.2 Logic Cốt Lõi
* **Xác thực:** Phải sử dụng **JWT (JSON Web Tokens)** để quản lý phiên sau khi OTP được xác thực thành công.
* **Giao tiếp Google Sheets:** Mọi thao tác CRUD (Create, Read, Update, Delete) phải đi qua một **Service Layer** (ví dụ: `googleSheetsService.js`) để tách biệt logic.
* **Cron Job:** Logic nhắc nhở phải sử dụng thư viện **`node-cron`** hoặc tương đương, chạy hàng ngày để kiểm tra `NextBillingDate` trong Sheet.
* **Mã OTP:** Mã OTP phải có **thời gian hết hạn** ngắn (ví dụ: 5 phút) và được xóa khỏi bộ nhớ tạm sau khi sử dụng hoặc hết hạn.

### 2.3 API Endpoints
* Phải theo chuẩn **RESTful** (ví dụ: `/api/subscriptions`, `/api/auth/request-code`).

## 3. MASTER DATA RULE
* Phải tạo một file **Master Data** (ví dụ: `cancellationLinks.json` hoặc một Sheet riêng) chứa các thông tin cố định như **URL Hủy Nhanh** và **Icon** cho các dịch vụ phổ biến, để Frontend có thể truy cập trực tiếp.

**YÊU CẦU CUỐI CÙNG:** LUÔN ƯU TIÊN **TÍNH TINH GỌN (LEAN)** VÀ **TỐC ĐỘ (PERFORMANCE)** TRONG MỌI QUYẾT ĐỊNH CODE. KHÔNG SỬ DỤNG THƯ VIỆN KHÔNG CẦN THIẾT.