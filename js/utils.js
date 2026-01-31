// Utility Functions

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// API base URL (dùng khi chạy qua Node server)
const API_BASE = window.location.origin;

// Get products from localStorage (cache) - dùng cho hiển thị nhanh
function getProducts() {
    const products = localStorage.getItem('products');
    return products ? JSON.parse(products) : [];
}

// Lưu products vào localStorage (cache)
function saveProductsToCache(products) {
    localStorage.setItem('products', JSON.stringify(products));
}

// Alias để tương thích code cũ
function saveProducts(products) {
    saveProductsToCache(products);
}

// Gọi API lấy danh sách sản phẩm (từ server Node.js)
async function fetchProductsFromAPI() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        if (!response.ok) throw new Error('API error');
        const products = await response.json();
        saveProductsToCache(products);
        return products;
    } catch (error) {
        console.warn('Không kết nối được API, dùng dữ liệu cache hoặc file tĩnh:', error.message);
        return null;
    }
}

// Load từ file JSON tĩnh (khi không chạy server)
async function loadProductsFromJSON() {
    try {
        const response = await fetch('data/products.json');
        const products = await response.json();
        saveProductsToCache(products);
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Khởi tạo dữ liệu: ưu tiên API, không được thì file JSON, cuối cùng giữ cache
async function initializeProducts() {
    const fromAPI = await fetchProductsFromAPI();
    if (fromAPI !== null) return fromAPI;

    const cached = getProducts();
    if (cached.length === 0) {
        await loadProductsFromJSON();
    }
    return getProducts();
}

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Add to cart
function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity });
    }
    
    saveCart(cart);
    showNotification('Đã thêm sản phẩm vào giỏ hàng!');
}

// Remove from cart
function removeFromCart(productId) {
    const cart = getCart();
    const newCart = cart.filter(item => item.id !== productId);
    saveCart(newCart);
    showNotification('Đã xóa sản phẩm khỏi giỏ hàng!');
}

// Update cart item quantity
function updateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        saveCart(cart);
    }
}

// Get cart count
function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// Update cart count in header
function updateCartCount() {
    const cartCount = getCartCount();
    const cartBadge = document.querySelector('.cart-count');
    if (cartBadge) {
        if (cartCount > 0) {
            cartBadge.textContent = cartCount;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: #2ecc71;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Get URL parameters
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Hiển thị ảnh sản phẩm (emoji hoặc img từ data URL) - dùng chung cho product card, detail, cart
function getProductImageHTML(image) {
    if (!image) return '📦';
    if (typeof image === 'string' && image.startsWith('data:')) return `<img src="${image}" alt="">`;
    return image;
}

// Get category name in Vietnamese
function getCategoryName(category) {
    const categories = {
        'thuc-pham-tuoi': 'Thực Phẩm Tươi',
        'do-kho': 'Đồ Khô',
        'do-uong': 'Đồ Uống',
        'banh-keo': 'Bánh Kẹo',
        'gia-vi': 'Gia Vị',
        'do-ve-sinh': 'Đồ Vệ Sinh'
    };
    return categories[category] || category;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    updateCartCount();
});
