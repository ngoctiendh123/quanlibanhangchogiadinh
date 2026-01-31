// Products Management (getProductImageHTML nằm trong utils.js)

// Render product card
function renderProductCard(product) {
    const imgHtml = getProductImageHTML(product.image);
    const qty = product.quantity ?? 0;
    const outOfStock = qty <= 0;
    const quantityText = outOfStock ? 'Hết hàng' : `Còn: ${qty}`;
    const addCartBtn = outOfStock
        ? '<button class="btn-add-cart btn-disabled" disabled>Hết hàng</button>'
        : `<button class="btn-add-cart" onclick="addToCart(${product.id})">Thêm Vào Giỏ</button>`;
    return `
        <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" data-id="${product.id}">
            <div class="product-image-wrap">
                <div class="product-image">${imgHtml}</div>
                ${outOfStock ? '<span class="product-badge-out">Hết hàng</span>' : ''}
                <span class="product-quantity-badge">${quantityText}</span>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${getCategoryName(product.category)}</p>
                <p class="product-price">${formatCurrency(product.price)}</p>
                <div class="product-actions">
                    ${addCartBtn}
                    <a href="product-detail.html?id=${product.id}" class="btn-view-detail">
                        Xem Chi Tiết
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Filter products
function filterProducts(products, searchTerm, category, sortBy) {
    let filtered = [...products];
    
    // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term)
        );
    }
    
    // Category filter
    if (category) {
        filtered = filtered.filter(product => product.category === category);
    }
    
    // Sort
    if (sortBy) {
        switch(sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }
    }
    
    return filtered;
}

// Render products grid
function renderProductsGrid(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p class="no-products">Không tìm thấy sản phẩm nào.</p>';
        return;
    }
    
    container.innerHTML = products.map(product => renderProductCard(product)).join('');
}

// Load and display featured products
async function loadFeaturedProducts() {
    await initializeProducts();
    const products = getProducts();
    const featured = products.filter(p => p.featured).slice(0, 6);
    renderProductsGrid(featured, 'featuredProducts');
}

// Load and display all products
async function loadAllProducts() {
    await initializeProducts();
    const products = getProducts();
    renderProductsGrid(products, 'productsGrid');
    
    // Setup filters
    setupProductFilters();
}

// Setup product filters
function setupProductFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (!searchInput || !categoryFilter || !sortFilter) return;
    
    function applyFilters() {
        const searchTerm = searchInput.value.trim();
        const category = categoryFilter.value;
        const sortBy = sortFilter.value;
        
        const products = getProducts();
        const filtered = filterProducts(products, searchTerm, category, sortBy);
        
        renderProductsGrid(filtered, 'productsGrid');
        
        // Show/hide no products message
        const noProducts = document.getElementById('noProducts');
        if (noProducts) {
            noProducts.style.display = filtered.length === 0 ? 'block' : 'none';
        }
    }
    
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
    
    // Search button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }
}

// Render product detail
function renderProductDetail(product) {
    const imgHtml = getProductImageHTML(product.image);
    const qty = product.quantity ?? 0;
    const outOfStock = qty <= 0;
    const stockText = outOfStock ? 'Hết hàng' : `Còn: ${qty}`;
    const addButton = outOfStock
        ? '<button class="btn btn-primary btn-disabled" disabled>Hết hàng</button>'
        : `<button class="btn btn-primary" onclick="addProductToCart()">Thêm Vào Giỏ Hàng</button>`;
    return `
        <div class="product-detail-image-wrap">
            <div class="product-detail-image">${imgHtml}</div>
            ${outOfStock ? '<span class="product-badge-out">Hết hàng</span>' : ''}
            <span class="product-detail-quantity">${stockText}</span>
        </div>
        <div class="product-detail-info">
            <h1>${product.name}</h1>
            <p class="product-detail-category">${getCategoryName(product.category)}</p>
            <p class="product-detail-price">${formatCurrency(product.price)}</p>
            <p class="product-detail-stock">${stockText}</p>
            <p class="product-detail-description">${product.description}</p>
            <div class="product-detail-actions">
                ${outOfStock ? '' : `
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
                    <input type="number" id="productQuantity" class="quantity-input" value="1" min="1" max="${qty}">
                    <button class="quantity-btn" onclick="increaseQuantity()">+</button>
                </div>
                `}
                ${addButton}
            </div>
        </div>
    `;
}

// Load product detail
async function loadProductDetail() {
    const productId = parseInt(getURLParameter('id'));
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }
    
    await initializeProducts();
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        window.location.href = 'products.html';
        return;
    }
    
    const container = document.getElementById('productDetail');
    if (container) {
        container.innerHTML = renderProductDetail(product);
    }
    
    // Load related products
    const related = products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);
    renderProductsGrid(related, 'relatedProducts');
}

// Quantity controls for product detail
function increaseQuantity() {
    const input = document.getElementById('productQuantity');
    if (input) {
        input.value = parseInt(input.value) + 1;
    }
}

function decreaseQuantity() {
    const input = document.getElementById('productQuantity');
    if (input && parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function addProductToCart() {
    const productId = parseInt(getURLParameter('id'));
    const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
    addToCart(productId, quantity);
}

// Category click handler
document.addEventListener('click', (e) => {
    const categoryCard = e.target.closest('.category-card');
    if (categoryCard) {
        const category = categoryCard.dataset.category;
        window.location.href = `products.html?category=${category}`;
    }
});

// Load category from URL
function loadCategoryFromURL() {
    const category = getURLParameter('category');
    if (category) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = category;
        }
    }
}
