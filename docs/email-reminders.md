# Mẫu Email CTA Gia Hạn và Cấu Hình Alerts

Tài liệu mô tả cách bật cảnh báo nhắc hạn qua email và mẫu email CTA chuyên nghiệp cho ToolX.

## Mốc nhắc hạn

- 7 ngày trước hạn (`remind-7`)
- 4 ngày trước hạn (`remind-4`)
- 2 ngày trước hạn (`remind-2`)
- 1 ngày trước hạn (`remind-1`)

## Biến môi trường cần thiết

```env
# SMTP (Gmail App Password khuyến nghị)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
SMTP_FROM=ToolX <your@gmail.com>

# Bật nhắc hạn
ALERT_ENABLED=true
ALERT_CC=ops@example.com

# Email CTA & Branding
LOGO_URL=https://your-pages-domain/toolx/logo.png
CTA_RENEW_URL=https://your-domain/renew
SUPPORT_EMAIL=support@your-domain.com
```

## Mẫu email

- Header thương hiệu (tùy chọn logo qua `LOGO_URL`)
- Tóm tắt dịch vụ, số ngày còn lại, chu kỳ, ngày đến hạn, giá tiền
- Nút CTA “Gia hạn ngay” trỏ tới `CTA_RENEW_URL` (tự động gắn query `?email=&service=`)
- Footer hỗ trợ qua `SUPPORT_EMAIL`

## Kiểm thử nhanh (dev-only)

Sau khi thiết lập `.env`, gọi endpoint `POST /api/__demo__/trigger-reminders` để kích hoạt gửi thử email nhắc hạn.