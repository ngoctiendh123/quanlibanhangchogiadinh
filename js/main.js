// Main JavaScript - Header and Navigation

// Render header
function renderHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    
    header.innerHTML = `
        <div class="header-container">
            <a href="products.html" class="logo">
                <span class="logo-icon">🛒</span>
                <span>Tạp Hóa Gia Đình</span>
            </a>
            <nav>
                <ul class="nav-menu">
                    <li><a href="products.html">Sản Phẩm</a></li>
                    <li><a href="cart.html">Giỏ Hàng</a></li>
                    <li><a href="admin.html">Quản Lý</a></li>
                    <li><a href="admin.html?tab=revenue">Doanh thu</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <div class="cart-badge">
                    <a href="cart.html" class="cart-icon">🛒</a>
                    <span class="cart-count" style="display: none;">0</span>
                </div>
                <div class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</div>
            </div>
        </div>
        <div class="mobile-menu" id="mobileMenu">
            <ul>
                <li><a href="products.html" onclick="closeMobileMenu()">Sản Phẩm</a></li>
                <li><a href="cart.html" onclick="closeMobileMenu()">Giỏ Hàng</a></li>
                <li><a href="admin.html" onclick="closeMobileMenu()">Quản Lý</a></li>
                <li><a href="admin.html?tab=revenue" onclick="closeMobileMenu()">Doanh thu</a></li>
            </ul>
        </div>
    `;
    
    updateCartCount();
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
    
    const currentPage = window.location.pathname.split('/').pop() || 'products.html';
    
    switch(currentPage) {
        case 'products.html':
        case '':
            loadAllProducts();
            loadCategoryFromURL();
            break;
        case 'product-detail.html':
            loadProductDetail();
            break;
        case 'cart.html':
            loadCartPage();
            break;
    }
});
