const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
const CUSTOMERS_FILE = path.join(__dirname, 'data', 'customers.json');

// Khóa API cho trợ lý nấu ăn (Gemini) — ưu tiên biến môi trường, nếu không có thì dùng giá trị mặc định bên dưới.
// LƯU Ý: Nếu public code, cần xóa khóa API này và chỉ cấu hình qua biến môi trường.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Khởi tạo client Gemini cho trợ lý nấu ăn
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const cookModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ========== Tài khoản Admin (CHỈ 1 TÀI KHOẢN – KHÔNG CÓ CHỨC NĂNG TẠO THÊM) ==========
// Admin duy nhất được cấu hình bằng biến môi trường ADMIN_USER, ADMIN_PASS (mặc định: admin / 123456).
// Không tồn tại API đăng ký admin hay tạo thêm admin; khách hàng không thể đăng ký trùng tên admin.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

// Middleware (tăng limit để nhận ảnh base64 từ camera)
app.use(express.json({ limit: '10mb' }));

// Session để lưu trạng thái đăng nhập (admin + khách hàng)
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'tap-hoa-gia-dinh-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        },
    })
);

// Phân quyền: chỉ cho phép admin với các API quản trị
function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res
        .status(403)
        .json({ error: 'Chỉ admin mới được phép thực hiện hành động này' });
}

// Phân quyền: chỉ cho phép khách hàng đã đăng nhập
function requireCustomer(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'customer') {
        return next();
    }
    return res
        .status(401)
        .json({ error: 'Khách hàng chưa đăng nhập' });
}

// Static files
app.use(express.static(__dirname));

// Trang gốc → trang chủ sàn TMĐT
app.get('/', (req, res) => res.redirect('/index.html'));

// ========== Auth & Roles ==========

// Thông tin user hiện tại (dùng cho header để biết role). Trả 200 + {} khi chưa đăng nhập để tránh 401 trong Console.
app.get('/api/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json(req.session.user);
    }
    return res.json({});
});

// Đăng xuất (cả admin và khách hàng)
app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

// Đọc file products.json
async function readProducts() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

// Ghi file products.json
async function writeProducts(products) {
    await fs.writeFile(
        DATA_FILE,
        JSON.stringify(products, null, 2),
        'utf8'
    );
}

// Đọc file orders.json
async function readOrders() {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

// Ghi file orders.json
async function writeOrders(orders) {
    await fs.writeFile(
        ORDERS_FILE,
        JSON.stringify(orders, null, 2),
        'utf8'
    );
}

// Đọc file customers.json
async function readCustomers() {
    try {
        const data = await fs.readFile(CUSTOMERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

// Ghi file customers.json
async function writeCustomers(customers) {
    await fs.writeFile(
        CUSTOMERS_FILE,
        JSON.stringify(customers, null, 2),
        'utf8'
    );
}

// ========== Auth: Admin (chỉ 1 tài khoản, không có API tạo thêm) ==========

// Đăng nhập admin – so khớp với ADMIN_USER / ADMIN_PASS; không có đăng ký admin.
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.user = { username, role: 'admin' };
        return res.json({ success: true, role: 'admin', username });
    }

    return res
        .status(401)
        .json({ error: 'Sai tài khoản hoặc mật khẩu' });
});

// Alias cũ (giữ để tương thích nếu có chỗ nào còn gọi)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body || {};

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.user = { username, role: 'admin' };
        return res.json({ success: true, role: 'admin', username });
    }

    return res
        .status(401)
        .json({ error: 'Sai tài khoản hoặc mật khẩu' });
});

// Thông tin admin hiện tại
app.get('/api/admin/me', requireAdmin, (req, res) => {
    return res.json(req.session.user);
});

// ========== Auth: Khách hàng ==========

// Đăng ký khách hàng (tài khoản = SĐT hoặc email). Không cho trùng tên admin – admin chỉ có 1, không tạo thêm.
app.post('/api/customer/register', async (req, res) => {
    try {
        const { username, password, name, phone, address, email } = req.body || {};
        const loginName = (username || '').trim();

        if (!loginName || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tên tài khoản (SĐT hoặc email) và mật khẩu.' });
        }

        if (loginName.toLowerCase() === ADMIN_USER.toLowerCase()) {
            return res.status(400).json({ error: 'Tên tài khoản này không được dùng để đăng ký.' });
        }

        const customers = await readCustomers();
        const existing = customers.find(c => c.username === loginName);
        if (existing) {
            return res.status(409).json({ error: 'Tài khoản này đã được đăng ký.' });
        }

        const newId = customers.length > 0
            ? Math.max(...customers.map(c => c.id)) + 1
            : 1;

        const customer = {
            id: newId,
            username: loginName,
            name: (name != null && typeof name === 'string') ? name.trim() : '',
            phone: (phone != null && typeof phone === 'string') ? phone.trim() : '',
            password,
            address: (address != null && typeof address === 'string') ? address.trim() : '',
            email: (email != null && typeof email === 'string') ? email.trim() : '',
            createdAt: new Date().toISOString()
        };

        customers.push(customer);
        await writeCustomers(customers);

        // Không tự đăng nhập sau đăng ký — bắt buộc khách đăng nhập lại và bổ sung thông tin giao hàng trước khi thanh toán.
        res.status(201).json({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đăng ký khách hàng' });
    }
});

// Đăng nhập khách hàng (identifier có thể là username, SĐT hoặc email)
app.post('/api/customer/login', async (req, res) => {
    try {
        const { identifier, username, phone, password } = req.body || {};
        const loginId = (identifier || username || phone || '').trim();
        if (!loginId || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tài khoản (SĐT hoặc email) và mật khẩu.' });
        }

        const customers = await readCustomers();
        const customer = customers.find(c =>
            (c.username === loginId || c.phone === loginId || c.email === loginId) &&
            c.password === password
        );
        if (!customer) {
            return res.status(401).json({ error: 'Sai số điện thoại hoặc mật khẩu.' });
        }

        req.session.user = {
            role: 'customer',
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone
        };

        res.json({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đăng nhập khách hàng' });
    }
});

// Demo: Đăng nhập bằng Google (mock, không gọi Google thật)
app.post('/api/customer/google-login-demo', async (req, res) => {
    try {
        const { email, name } = req.body || {};
        if (!email) {
            return res.status(400).json({ error: 'Thiếu email Google.' });
        }

        const customers = await readCustomers();
        let customer = customers.find(c => c.email === email);

        if (!customer) {
            const newId = customers.length > 0
                ? Math.max(...customers.map(c => c.id)) + 1
                : 1;
            customer = {
                id: newId,
                username: email,
                name: name || email.split('@')[0],
                phone: '',
                password: '',
                address: '',
                email,
                createdAt: new Date().toISOString()
            };
            customers.push(customer);
            await writeCustomers(customers);
        }

        req.session.user = {
            role: 'customer',
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone
        };

        res.json({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đăng nhập Google demo' });
    }
});

// Thông tin khách hàng hiện tại
app.get('/api/customer/me', requireCustomer, async (req, res) => {
    try {
        const customers = await readCustomers();
        const customer = customers.find(c => c.id === req.session.user.customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
        }
        res.json({
            id: customer.id,
            username: customer.username,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể lấy thông tin khách hàng' });
    }
});

// Cập nhật thông tin hồ sơ khách hàng
app.put('/api/customer/profile', requireCustomer, async (req, res) => {
    try {
        const { name, phone, address, email } = req.body || {};
        const customers = await readCustomers();
        const idx = customers.findIndex(c => c.id === req.session.user.customerId);
        if (idx === -1) {
            return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
        }
        const customer = customers[idx];
        if (name !== undefined) customer.name = name.trim();
        if (phone !== undefined) customer.phone = phone.trim();
        if (address !== undefined) customer.address = address.trim();
        if (email !== undefined) customer.email = email.trim();

        await writeCustomers(customers);

        // Cập nhật lại session để header hiển thị đúng tên
        req.session.user.name = customer.name;
        req.session.user.phone = customer.phone;

        res.json({
            id: customer.id,
            username: customer.username,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể cập nhật thông tin khách hàng' });
    }
});

// ========== API Products ==========

// GET /api/products - Lấy tất cả sản phẩm (đảm bảo có quantity)
app.get('/api/products', async (req, res) => {
    try {
        const products = await readProducts();
        const normalized = products.map(p => ({ ...p, quantity: p.quantity ?? 0 }));
        res.json(normalized);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đọc dữ liệu sản phẩm' });
    }
});

// POST /api/products - Thêm sản phẩm mới (admin)
app.post('/api/products', requireAdmin, async (req, res) => {
    try {
        const products = await readProducts();
        const newProduct = req.body;

        const newId = products.length > 0
            ? Math.max(...products.map(p => p.id)) + 1
            : 1;

        const product = {
            id: newId,
            name: newProduct.name || '',
            category: newProduct.category || 'do-kho',
            price: parseInt(newProduct.price) || 0,
            quantity: parseInt(newProduct.quantity) >= 0 ? parseInt(newProduct.quantity) : 0,
            image: newProduct.image || '📦',
            description: newProduct.description || '',
            featured: Boolean(newProduct.featured)
        };

        products.push(product);
        await writeProducts(products);

        res.status(201).json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể thêm sản phẩm' });
    }
});

// PUT /api/products/:id - Cập nhật sản phẩm (admin)
app.put('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const products = await readProducts();
        const index = products.findIndex(p => p.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        const body = req.body;
        products[index] = {
            ...products[index],
            name: body.name !== undefined ? body.name : products[index].name,
            category: body.category !== undefined ? body.category : products[index].category,
            price: body.price !== undefined ? parseInt(body.price) : products[index].price,
            quantity: body.quantity !== undefined ? (parseInt(body.quantity) >= 0 ? parseInt(body.quantity) : products[index].quantity) : (products[index].quantity ?? 0),
            image: body.image !== undefined ? body.image : products[index].image,
            description: body.description !== undefined ? body.description : products[index].description,
            featured: body.featured !== undefined ? Boolean(body.featured) : products[index].featured
        };

        await writeProducts(products);
        res.json(products[index]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể cập nhật sản phẩm' });
    }
});

// DELETE /api/products/:id - Xóa sản phẩm và đánh lại số thứ tự (id = 1, 2, 3, ...) (admin)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const products = await readProducts();
        const index = products.findIndex(p => p.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        products.splice(index, 1);

        // Đánh lại id liên tiếp 1, 2, 3, ... và tạo mapping (id cũ -> id mới) cho giỏ hàng
        const idMapping = {};
        products.forEach((p, i) => {
            const oldId = p.id;
            const newId = i + 1;
            if (oldId !== newId) idMapping[oldId] = newId;
            p.id = newId;
        });

        await writeProducts(products);
        res.json({ success: true, products, idMapping });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể xóa sản phẩm' });
    }
});

// POST /api/products/import - Ghi đè toàn bộ (nhập từ file JSON) (admin)
app.post('/api/products/import', requireAdmin, async (req, res) => {
    try {
        let products = req.body;
        if (!Array.isArray(products)) {
            return res.status(400).json({ error: 'Body phải là mảng sản phẩm' });
        }
        products = products.map((p, i) => ({
            id: p.id || i + 1,
            name: p.name || '',
            category: p.category || 'do-kho',
            price: parseInt(p.price) || 0,
            quantity: parseInt(p.quantity) >= 0 ? parseInt(p.quantity) : 0,
            image: p.image || '📦',
            description: p.description || '',
            featured: Boolean(p.featured)
        }));
        await writeProducts(products);
        res.json({ success: true, count: products.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể nhập dữ liệu' });
    }
});

// ========== API Orders (Doanh thu) ==========

// Chuẩn hóa đơn hàng (3 trạng thái: pending, shipped, delivered)
function normalizeOrder(order) {
    const oldToNew = { processing: 'shipped', cancelled: 'pending' };
    order.status = oldToNew[order.status] || order.status || 'pending';
    if (!['pending', 'shipped', 'delivered'].includes(order.status)) order.status = 'pending';
    return order;
}

// GET /api/orders/pending-count - Số đơn chờ xử lý (cho thông báo admin)
app.get('/api/orders/pending-count', requireAdmin, async (req, res) => {
    try {
        const orders = (await readOrders()).map(normalizeOrder);
        const count = orders.filter(o => o.status === 'pending').length;
        res.json({ count });
    } catch (err) {
        res.json({ count: 0 });
    }
});

// GET /api/orders - Lấy tất cả đơn hàng (chỉ admin xem doanh thu)
app.get('/api/orders', requireAdmin, async (req, res) => {
    try {
        const orders = (await readOrders()).map(normalizeOrder);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đọc đơn hàng' });
    }
});

// POST /api/orders - Lưu đơn hàng mới và trừ số lượng sản phẩm
app.post('/api/orders', async (req, res) => {
    try {
        const orders = await readOrders();
        const products = await readProducts();
        const { items, total, customer } = req.body || {};

        let customerId = null;
        if (req.session && req.session.user && req.session.user.role === 'customer') {
            customerId = req.session.user.customerId || null;
        }

        let customerInfo = {
            name: customer?.name || '',
            phone: customer?.phone || '',
            address: customer?.address || ''
        };

        if (customerId && (!customerInfo.name || !customerInfo.phone) && customerInfo.address === '') {
            const customers = await readCustomers();
            const cust = customers.find(c => c.id === customerId);
            if (cust) {
                customerInfo = { name: cust.name || '', phone: cust.phone || '', address: cust.address || '' };
            }
        }

        const newOrder = {
            id: Date.now(),
            date: new Date().toISOString(),
            items: items || [],
            total: parseInt(total) || 0,
            paymentMethod: req.body.paymentMethod || 'QR',
            status: (req.session && req.session.user && req.session.user.role === 'admin') ? 'delivered' : 'pending',
            customerId,
            customer: customerInfo
        };
        // Trừ tồn kho
        for (const item of newOrder.items) {
            const p = products.find(pr => pr.id === item.id);
            if (p) {
                const q = parseInt(p.quantity) || 0;
                const sold = parseInt(item.quantity) || 0;
                p.quantity = Math.max(0, q - sold);
            }
        }
        await writeProducts(products);
        orders.push(newOrder);
        await writeOrders(orders);
        res.status(201).json(newOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể lưu đơn hàng' });
    }
});

// PUT /api/orders/:id/status - Cập nhật trạng thái đơn hàng (admin)
app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body || {};
        const validStatuses = ['pending', 'shipped', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        }
        const orders = await readOrders();
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        orders[idx].status = status;
        await writeOrders(orders);
        res.json(orders[idx]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể cập nhật trạng thái' });
    }
});

// Đơn hàng của khách hàng hiện tại
app.get('/api/customer/orders', requireCustomer, async (req, res) => {
    try {
        const orders = (await readOrders()).map(normalizeOrder);
        const customerId = req.session.user.customerId;
        const filtered = orders.filter(o => o.customerId === customerId);
        res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể đọc đơn hàng khách hàng' });
    }
});

// ========== Chat AI trợ lý nấu ăn ==========
app.post('/api/chat-cook', async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(500).json({ error: 'Chưa cấu hình khóa API cho trợ lý nấu ăn.' });
        }

        const { message } = req.body || {};
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Vui lòng nhập nội dung câu hỏi.' });
        }

        const systemPrompt =
            'Bạn là trợ lý nấu ăn thân thiện, trả lời bằng tiếng Việt, gợi ý món ăn, cách chế biến, nguyên liệu, ' +
            'lưu ý an toàn thực phẩm phù hợp với gia đình Việt Nam. Chỉ trả lời các câu hỏi liên quan đến nấu ăn, bếp núc, dinh dưỡng.';

        const prompt = `${systemPrompt}\n\nCâu hỏi của người dùng: ${message}`;

        const result = await cookModel.generateContent(prompt);
        const response = await result.response;
        const text = (response && typeof response.text === 'function')
            ? response.text()
            : '';

        const reply = (text && text.trim())
            ? text.trim()
            : 'Xin lỗi, hiện mình chưa trả lời được. Bạn thử hỏi lại giúp mình nhé.';

        res.json({ reply });
    } catch (err) {
        console.error('Chat cook error:', err);
        res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý yêu cầu. Bạn thử lại sau nhé.' });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Mở trình duyệt: http://localhost:${PORT}`);
});
