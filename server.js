const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Middleware (tăng limit để nhận ảnh base64 từ camera)
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Trang gốc chuyển sang Sản phẩm
app.get('/', (req, res) => res.redirect('/products.html'));

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

// POST /api/products - Thêm sản phẩm mới
app.post('/api/products', async (req, res) => {
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

// PUT /api/products/:id - Cập nhật sản phẩm
app.put('/api/products/:id', async (req, res) => {
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

// DELETE /api/products/:id - Xóa sản phẩm và đánh lại số thứ tự (id = 1, 2, 3, ...)
app.delete('/api/products/:id', async (req, res) => {
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

// POST /api/products/import - Ghi đè toàn bộ (nhập từ file JSON)
app.post('/api/products/import', async (req, res) => {
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

// GET /api/orders - Lấy tất cả đơn hàng
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await readOrders();
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
        const { items, total } = req.body; // items: [{ id, quantity }]
        const newOrder = {
            id: Date.now(),
            date: new Date().toISOString(),
            items: items || [],
            total: parseInt(total) || 0,
            paymentMethod: req.body.paymentMethod || 'QR'
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

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Mở trình duyệt: http://localhost:${PORT}`);
});
