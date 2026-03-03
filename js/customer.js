// Trang quản lý tài khoản khách hàng (sau khi đăng nhập)

async function loadCustomerPage() {
    try {
        const profileRes = await fetch(`${API_BASE}/api/customer/me`);
        if (!profileRes.ok) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent('customer.html');
            return;
        }
        const profile = await profileRes.json();

        const fromCart = new URLSearchParams(window.location.search).get('from') === 'cart';
        const fromCartEl = document.getElementById('customerFromCartHint');
        if (fromCartEl) {
            if (fromCart) {
                fromCartEl.style.display = 'block';
                fromCartEl.innerHTML = 'Bạn đang từ giỏ hàng. Vui lòng điền đủ <strong>họ tên, SĐT và địa chỉ giao hàng</strong> bên dưới, bấm <strong>Lưu thông tin</strong>, rồi quay lại <a href="cart.html">Giỏ hàng</a> để thanh toán.';
            } else {
                fromCartEl.style.display = 'none';
            }
        }

        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileAddress').value = profile.address || '';
        document.getElementById('profileEmail').value = profile.email || '';

        const ordersRes = await fetch(`${API_BASE}/api/customer/orders`);
        let orders = [];
        if (ordersRes.ok) orders = await ordersRes.json();

        const tbody = document.getElementById('customerOrdersList');
        const emptyEl = document.getElementById('customerOrdersEmpty');
        if (orders.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        await initializeProducts();
        const products = getProducts();

        tbody.innerHTML = orders.slice().reverse().map(order => {
            const date = order.date ? new Date(order.date).toLocaleString('vi-VN') : '-';
            const itemsText = (order.items || []).map(item => {
                const p = products.find(pr => pr.id === item.id);
                const name = p ? p.name : 'SP #' + item.id;
                return name + ' x' + (item.quantity || 0);
            }).join(', ') || '-';
            const status = order.status || 'pending';
            const statusLabel = typeof getOrderStatusLabel === 'function' ? getOrderStatusLabel(status) : status;
            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px;">#${order.id}</td>
                    <td style="padding: 10px;">${date}</td>
                    <td style="padding: 10px;">${itemsText}</td>
                    <td style="padding: 10px;">${formatCurrency(order.total || 0)}</td>
                    <td style="padding: 10px;">${statusLabel}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        window.location.href = 'login.html?redirect=' + encodeURIComponent('customer.html');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || '';
    if (page !== 'customer.html') return;

    const logoutBtn = document.getElementById('customerLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/api/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            } catch (e) {}
            if (typeof showNotification === 'function') showNotification('Đã đăng xuất');
            window.location.href = 'products.html';
        });
    }

    const form = document.getElementById('customerProfileForm');
    const messageEl = document.getElementById('customerProfileMessage');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = (document.getElementById('profileName') && document.getElementById('profileName').value) || '';
            const phone = (document.getElementById('profilePhone') && document.getElementById('profilePhone').value) || '';
            const address = (document.getElementById('profileAddress') && document.getElementById('profileAddress').value) || '';
            const email = (document.getElementById('profileEmail') && document.getElementById('profileEmail').value) || '';
            if (messageEl) { messageEl.style.display = 'none'; messageEl.textContent = ''; }
            try {
                const res = await fetch(`${API_BASE}/api/customer/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim(), email: email.trim() })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (messageEl) { messageEl.textContent = data.error || 'Không thể lưu.'; messageEl.style.display = 'block'; }
                    return;
                }
                if (typeof showNotification === 'function') showNotification('Đã lưu thông tin.');
                if (messageEl) { messageEl.textContent = 'Đã cập nhật.'; messageEl.style.display = 'block'; messageEl.style.color = 'var(--primary-color)'; }
            } catch (err) {
                if (messageEl) { messageEl.textContent = 'Không kết nối được server.'; messageEl.style.display = 'block'; }
            }
        });
    }
});
