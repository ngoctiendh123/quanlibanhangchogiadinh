# Website Bán Hàng Tạp Hóa Gia Đình

Website bán hàng tạp hóa với đầy đủ chức năng: HTML, CSS, JavaScript và **Node.js** (Express) để lưu sản phẩm vào file `data/products.json`.

## Tính Năng

- ✅ Danh sách sản phẩm với tìm kiếm và lọc
- ✅ Chi tiết sản phẩm
- ✅ Giỏ hàng với thêm/xóa/cập nhật số lượng
- ✅ Thanh toán QR trực tiếp từ giỏ hàng (bỏ bước xác nhận đơn)
- ✅ **Trang quản lý sản phẩm (Admin)** - Thêm/Sửa/Xóa sản phẩm, **lưu vào file** khi chạy server
- ✅ **Xuất/Nhập file JSON** - Backup và restore; nhập qua Admin sẽ ghi đè file khi có server
- ✅ Responsive design (tương thích với mọi thiết bị)
- ✅ **Backend Node.js** - API đọc/ghi `data/products.json`, dữ liệu không mất khi tắt trình duyệt

## Cấu Trúc Thư Mục

```
webbanhangchogiadinh/
├── products.html          # Danh sách sản phẩm (trang chính)
├── product-detail.html     # Chi tiết sản phẩm
├── cart.html              # Giỏ hàng
├── checkout.html          # Chuyển hướng về cart.html
├── admin.html             # Trang quản lý sản phẩm
├── server.js              # Server Node.js (Express) - API + phục vụ file tĩnh
├── package.json           # NPM (express)
├── css/
│   ├── style.css         # CSS chính
│   ├── header.css        # CSS cho header
│   ├── products.css      # CSS cho sản phẩm
│   ├── cart.css          # CSS cho giỏ hàng
│   ├── admin.css         # CSS cho trang admin
│   └── responsive.css    # CSS responsive
├── js/
│   ├── main.js          # JavaScript chính
│   ├── utils.js         # Các hàm tiện ích
│   ├── products.js      # Quản lý sản phẩm
│   ├── cart.js          # Quản lý giỏ hàng
│   └── admin.js         # Quản lý admin (CRUD)
└── data/
    └── products.json    # Dữ liệu sản phẩm
```

## Cách Chạy (Khuyến nghị: dùng Node.js để lưu đúng vào file)

### Bước 1: Cài đặt và chạy server
```bash
npm install
npm start
```
Mở trình duyệt: **http://localhost:3000**

### Bước 2: Sử dụng website
- **Sản phẩm**: http://localhost:3000 hoặc http://localhost:3000/products.html
- **Sản phẩm**: Duyệt, thêm giỏ hàng, thanh toán
- **Admin**: http://localhost:3000/admin.html — Thêm/Sửa/Xóa sản phẩm sẽ **lưu vào `data/products.json`**

### Nếu không chạy server
- Mở trực tiếp file `index.html` (hoặc dùng extension Live Server): dữ liệu Admin chỉ lưu trong LocalStorage (cache), **không ghi vào file**.
- Khi chạy lại `npm start`, dữ liệu đọc từ `data/products.json` (đã lưu trước đó).

## Responsive Design

Website được thiết kế responsive với các breakpoint:
- Desktop: > 968px
- Tablet: 768px - 968px
- Mobile: < 768px
- Small Mobile: < 480px

## Công Nghệ Sử Dụng

- **Node.js** (Express) — API và phục vụ file tĩnh
- HTML5, CSS3 (Flexbox, Grid), JavaScript (ES6+)
- LocalStorage (cache + giỏ hàng, đơn hàng)
- File `data/products.json` — nguồn dữ liệu sản phẩm (đọc/ghi bởi server)

## API (khi chạy `npm start`)

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | /api/products | Lấy tất cả sản phẩm |
| POST | /api/products | Thêm sản phẩm mới |
| PUT | /api/products/:id | Cập nhật sản phẩm |
| DELETE | /api/products/:id | Xóa sản phẩm |
| POST | /api/products/import | Ghi đè toàn bộ (body: mảng JSON) |

## Ghi Chú

- **Có chạy server**: Thêm/Sửa/Xóa/Nhập từ Admin đều ghi vào `data/products.json`.
- **Không chạy server**: Chỉ lưu cache (LocalStorage); mở lại file sẽ đọc lại từ `data/products.json` (nội dung cũ).
- Giỏ hàng và đơn hàng vẫn dùng LocalStorage (trình duyệt).
