// Main JavaScript - Header and Navigation

// Render header
function renderHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    const currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const isAdminPage = ['admin.html', 'admin-products.html', 'admin-revenue.html', 'admin-counter.html'].includes(currentPage);

    if (isAdminPage) {
        header.style.display = 'none';
        return;
    }
    header.style.display = '';
    
    header.innerHTML = `
        <div class="header-container">
            <a href="index.html" class="logo">
                <span class="logo-icon">🛒</span>
                <span>Tạp Hóa Gia Đình</span>
            </a>
            <nav>
                <ul class="nav-menu">
                    <li class="nav-item-home"><a href="index.html">Trang chủ</a></li>
                    <li class="nav-item-products"><a href="products.html">Sản Phẩm</a></li>
                    <li class="nav-item-cart"><a href="cart.html">Giỏ Hàng</a></li>
                    <li class="nav-item-account" style="display: none;"><a href="customer.html">Tài khoản</a></li>
                    <li class="nav-item-logout" style="display: none;"><a href="#" onclick="handleHeaderLogout(event)">Đăng xuất</a></li>
                    <li class="nav-item-login"><a href="login.html">Đăng nhập</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <div class="cart-badge header-cart-wrap">
                    <a href="cart.html" class="cart-icon">🛒</a>
                    <span class="cart-count" style="display: none;">0</span>
                </div>
                <div class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</div>
            </div>
        </div>
        <div class="mobile-menu" id="mobileMenu">
            <ul>
                <li class="mobile-item-home"><a href="index.html" onclick="closeMobileMenu()">Trang chủ</a></li>
                <li class="mobile-item-products"><a href="products.html" onclick="closeMobileMenu()">Sản Phẩm</a></li>
                <li class="mobile-item-cart"><a href="cart.html" onclick="closeMobileMenu()">Giỏ Hàng</a></li>
                <li class="mobile-item-account" style="display: none;"><a href="customer.html" onclick="closeMobileMenu()">Tài khoản</a></li>
                <li class="mobile-item-logout" style="display: none;"><a href="#" onclick="handleHeaderLogout(event); closeMobileMenu();">Đăng xuất</a></li>
                <li class="mobile-item-login"><a href="login.html" onclick="closeMobileMenu()">Đăng nhập</a></li>
            </ul>
        </div>
    `;
    
    updateCartCount();
    updateHeaderForRole();
}

// Ẩn Trang chủ, Giỏ hàng, icon giỏ hàng khi admin; hiện/ẩn Đăng nhập vs Đăng xuất theo role
async function updateHeaderForRole() {
    const hideForAdmin = [
        '.nav-item-home', '.nav-item-products', '.nav-item-cart', '.header-cart-wrap',
        '.mobile-item-home', '.mobile-item-products', '.mobile-item-cart'
    ];
    const logoutItems = ['.nav-item-logout', '.mobile-item-logout'];
    const loginItems = ['.nav-item-login', '.mobile-item-login'];
    const accountItems = ['.nav-item-account', '.mobile-item-account'];

    const showGuest = () => {
        hideForAdmin.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
        logoutItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
        accountItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
        loginItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
    };
    const showAdmin = () => {
        hideForAdmin.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
        logoutItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
        accountItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
        loginItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
    };
    const showCustomer = () => {
        hideForAdmin.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
        logoutItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
        accountItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = ''; }));
        loginItems.forEach(sel => document.querySelectorAll(sel).forEach(el => { if (el) el.style.display = 'none'; }));
    };

    showGuest();
    try {
        const res = await fetch(`${API_BASE}/api/me`);
        if (!res.ok) return;
        const user = await res.json();
        if (user.role === 'admin') showAdmin();
        else if (user.role === 'customer') showCustomer();
    } catch (e) {}
}

async function handleHeaderLogout(event) {
    event.preventDefault();
    try {
        await fetch(`${API_BASE}/api/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (e) {}
    if (typeof showNotification === 'function') showNotification('Đã đăng xuất');
    window.location.href = 'index.html';
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
    }
}

// Close mobile menu
function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.remove('active');
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobileMenu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenu && toggle && 
        !mobileMenu.contains(e.target) && 
        !toggle.contains(e.target)) {
        mobileMenu.classList.remove('active');
    }
});

// Initialize page based on current page
document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch(currentPage) {
        case 'index.html':
        case '':
        case 'index':
            if (typeof loadFeaturedProducts === 'function') loadFeaturedProducts();
            break;
        case 'products.html':
            loadAllProducts();
            loadCategoryFromURL();
            break;
        case 'product-detail.html':
            loadProductDetail();
            break;
        case 'cart.html':
            loadCartPage();
            break;
        case 'customer.html':
            if (typeof loadCustomerPage === 'function') loadCustomerPage();
            break;
    }
});
