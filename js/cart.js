// Cart Management

// Close QR modal when clicking outside
window.onclick = function(event) {
    const qrModal = document.getElementById('qrModal');
    if (event.target === qrModal) {
        closeQRModal();
    }
}

let currentCustomerProfile = null;

// Render cart items
function renderCartItems() {
    const cart = getCart();
    const products = getProducts();
    
    if (cart.length === 0) {
        document.getElementById('cartItems').style.display = 'none';
        document.getElementById('emptyCart').style.display = 'block';
        updateCartSummary();
        return;
    }
    
    document.getElementById('cartItems').style.display = 'block';
    document.getElementById('emptyCart').style.display = 'none';
    
    const cartItemsHTML = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (!product) return '';
        
        const total = product.price * cartItem.quantity;
        
        return `
            <div class="cart-item">
                <div class="cart-item-image">${getProductImageHTML(product.image)}</div>
                <div class="cart-item-info">
                    <h3 class="cart-item-name">${product.name}</h3>
                    <p class="cart-item-category">${getCategoryName(product.category)}</p>
                    <p class="cart-item-price">${formatCurrency(product.price)}</p>
                    <div class="cart-item-controls">
                        <div class="cart-item-quantity">
                            <button onclick="updateCartItemQuantity(${product.id}, ${cartItem.quantity - 1})">-</button>
                            <input type="number" value="${cartItem.quantity}" min="1" 
                                   onchange="updateCartItemQuantity(${product.id}, parseInt(this.value))">
                            <button onclick="updateCartItemQuantity(${product.id}, ${cartItem.quantity + 1})">+</button>
                        </div>
                        <button class="cart-item-remove" onclick="removeCartItem(${product.id})">
                            Xóa
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">
                    ${formatCurrency(total)}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartItems').innerHTML = cartItemsHTML;
    updateCartSummary();
}

// Update cart item quantity
function updateCartItemQuantity(productId, quantity) {
    updateCartQuantity(productId, quantity);
    renderCartItems();
}

// Remove cart item
function removeCartItem(productId) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        removeFromCart(productId);
        renderCartItems();
    }
}

// Update cart summary
function updateCartSummary() {
    const cart = getCart();
    const products = getProducts();
    
    let total = 0;
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
            total += product.price * cartItem.quantity;
        }
    });
    
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) {
        subtotalEl.textContent = formatCurrency(total);
    }
    const totalEl = document.getElementById('total');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
}

// Load cart page
async function loadCartPage() {
    await initializeProducts();
    try {
        const res = await fetch(`${API_BASE}/api/customer/me`);
        if (res.ok) currentCustomerProfile = await res.json();
        else currentCustomerProfile = null;
    } catch (e) {
        currentCustomerProfile = null;
    }
    renderCartItems();

    // Hiện gợi ý đăng nhập nếu chưa đăng nhập
    const loginHint = document.getElementById('cartLoginHint');
    if (loginHint) loginHint.style.display = currentCustomerProfile ? 'none' : 'block';

    // Thanh toán (mua online): bắt buộc đăng nhập. Đã đăng nhập thì chọn COD hoặc QR và thanh toán bình thường.
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const cart = getCart();
            if (cart.length === 0) {
                alert('Giỏ hàng của bạn đang trống!');
                return;
            }
            if (!currentCustomerProfile) {
                if (typeof showNotification === 'function') showNotification('Bạn cần đăng nhập để thanh toán đơn hàng online.');
                window.location.href = 'login.html?redirect=' + encodeURIComponent('cart.html');
                return;
            }
            // Đã đăng nhập: bắt buộc có đủ thông tin giao hàng (họ tên, SĐT, địa chỉ) mới cho thanh toán.
            const name = (currentCustomerProfile.name || '').trim();
            const phone = (currentCustomerProfile.phone || '').trim();
            const address = (currentCustomerProfile.address || '').trim();
            if (!name || !phone || !address) {
                if (typeof showNotification === 'function') showNotification('Vui lòng bổ sung thông tin giao hàng (họ tên, SĐT, địa chỉ) tại trang Tài khoản trước khi đặt hàng.');
                window.location.href = 'customer.html?from=cart';
                return;
            }
            const method = document.querySelector('input[name="paymentMethod"]:checked');
            const isQR = method && method.value === 'QR';
            if (isQR) {
                showQRModal();
            } else {
                confirmPayment('COD');
            }
        });
    }
}

// Show QR Modal
function showQRModal() {
    const cart = getCart();
    const products = getProducts();
    
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
    }
    
    // Calculate total
    let total = 0;
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
            total += product.price * cartItem.quantity;
        }
    });
    
    const bankId = 'MBBANK';
    const accountNo = '0945768636';
    const template = 'compact';
    const amount = Math.round(total); // Số tiền VND
    const addInfo = 'Thanh toan don hang';
    const accountName = 'Tai khoan thanh toan'; // Đổi tên chủ TK nếu cần
    
    // 1. Cập nhật số tiền hiển thị NGAY (trước khi mở modal)
    const qrAmountEl = document.getElementById('qrAmount');
    if (qrAmountEl) {
        qrAmountEl.textContent = formatCurrency(total);
    }
    
    // 2. Ảnh QR từ img.vietqr.io với query amount/addInfo/accountName — quét mã sẽ tự điền số tiền
    const qrCodeImage = document.getElementById('qrCodeImage');
    if (qrCodeImage) {
        qrCodeImage.alt = `QR Code thanh toán ${formatCurrency(total)}`;
        qrCodeImage.style.opacity = '1';
        const qrUrl = 'https://img.vietqr.io/image/' + bankId + '-' + accountNo + '-' + template + '.png' +
            '?amount=' + amount +
            '&addInfo=' + encodeURIComponent(addInfo) +
            '&accountName=' + encodeURIComponent(accountName);
        qrCodeImage.src = qrUrl;
    }
    
    // 3. Mở modal SAU KHI đã set số tiền và ảnh
    const qrModal = document.getElementById('qrModal');
    if (qrModal) {
        qrModal.classList.add('active');
    }
}

// Close QR Modal
function closeQRModal() {
    const qrModal = document.getElementById('qrModal');
    if (qrModal) {
        qrModal.classList.remove('active');
    }
}

// Confirm payment (paymentMethodArg: 'COD' | 'QR'). Chỉ gọi khi đã đăng nhập khách.
async function confirmPayment(paymentMethodArg) {
    const cart = getCart();
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
    }

    const paymentMethod = paymentMethodArg === 'QR' || paymentMethodArg === 'QR Code'
        ? 'Thanh toán qua quét mã QR'
        : 'Thanh toán khi nhận hàng';

    const products = getProducts();
    let total = 0;
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) total += product.price * cartItem.quantity;
    });

    const customerPayload = currentCustomerProfile
        ? { name: currentCustomerProfile.name || '', phone: currentCustomerProfile.phone || '', address: currentCustomerProfile.address || '' }
        : {};

    try {
        const res = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart, total, paymentMethod, customer: customerPayload })
        });
        if (res.ok) {
            await initializeProducts();
        } else {
            throw new Error();
        }
    } catch (e) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push({
            items: cart,
            total,
            id: Date.now(),
            date: new Date().toISOString(),
            status: 'pending',
            paymentMethod
        });
        localStorage.setItem('orders', JSON.stringify(orders));
    }

    saveCart([]);
    if (paymentMethodArg === 'QR' || paymentMethodArg === 'QR Code') {
        closeQRModal();
    }
    alert('Đặt hàng thành công! Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi.');
    window.location.href = 'products.html';
}
