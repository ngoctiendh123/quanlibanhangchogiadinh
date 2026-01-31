// Admin Management

let editingProductId = null;

// Load admin page
async function loadAdminPage() {
    await initializeProducts();
    initProductImageInputs();
    renderAdminProductsList();
    setupAdminFilters();
    // Mở thẳng tab Doanh thu nếu vào bằng link ?tab=revenue
    const tab = (new URLSearchParams(window.location.search)).get('tab');
    if (tab === 'revenue') {
        switchAdminTab('revenue');
    }
}

// Render admin products list
function renderAdminProductsList(products = null) {
    const productsList = products || getProducts();
    const tbody = document.getElementById('adminProductsList');
    const noProducts = document.getElementById('adminNoProducts');
    
    if (!tbody) return;
    
    if (productsList.length === 0) {
        tbody.innerHTML = '';
        if (noProducts) noProducts.style.display = 'block';
        return;
    }
    
    if (noProducts) noProducts.style.display = 'none';
    
    tbody.innerHTML = productsList.map(product => `
        <tr>
            <td>${product.id}</td>
            <td class="product-icon-cell">${product.image && product.image.startsWith('data:') ? `<img src="${product.image}" alt="">` : (product.image || '📦')}</td>
            <td class="product-name-cell">${product.name}</td>
            <td class="product-category-cell">${getCategoryName(product.category)}</td>
            <td class="product-price-cell">${formatCurrency(product.price)}</td>
            <td class="product-quantity-cell">${product.quantity ?? 0}</td>
            <td class="product-featured-cell">
                <span class="featured-badge ${product.featured ? '' : 'no'}">
                    ${product.featured ? 'Có' : 'Không'}
                </span>
            </td>
            <td class="product-actions-cell">
                <button class="btn-edit" onclick="editProduct(${product.id})">Sửa</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">Xóa</button>
            </td>
        </tr>
    `).join('');
}

// Show add product form
function showAddProductForm() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Sản Phẩm Mới';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productImageEmoji').value = '';
    document.getElementById('productImageFile').value = '';
    document.getElementById('productQuantity').value = '0';
    updateProductImagePreview('📦');
    document.getElementById('productModal').classList.add('active');
}

// Close product form
function closeProductForm() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

// Edit product
function editProduct(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Sửa Sản Phẩm';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    const imgVal = product.image || '';
    document.getElementById('productImage').value = imgVal;
    if (imgVal && !imgVal.startsWith('data:')) {
        document.getElementById('productImageEmoji').value = imgVal;
    } else {
        document.getElementById('productImageEmoji').value = '';
    }
    document.getElementById('productImageFile').value = '';
    updateProductImagePreview(imgVal || '📦');
    document.getElementById('productQuantity').value = (product.quantity ?? 0);
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productFeatured').checked = product.featured || false;
    
    document.getElementById('productModal').classList.add('active');
}

// Cập nhật preview ảnh sản phẩm (emoji hoặc data URL)
function updateProductImagePreview(value) {
    const placeholder = document.getElementById('imagePlaceholder');
    const imgEl = document.getElementById('productImageImg');
    if (!placeholder || !imgEl) return;
    if (value && value.startsWith('data:')) {
        imgEl.src = value;
        imgEl.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        imgEl.src = '';
        imgEl.style.display = 'none';
        placeholder.textContent = value || '📦';
        placeholder.style.display = 'block';
    }
}

// Khởi tạo sự kiện chụp/chọn ảnh và emoji
function initProductImageInputs() {
    const fileInput = document.getElementById('productImageFile');
    const emojiInput = document.getElementById('productImageEmoji');
    const hiddenInput = document.getElementById('productImage');
    if (!fileInput || !emojiInput || !hiddenInput) return;
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            hiddenInput.value = dataUrl;
            emojiInput.value = '';
            updateProductImagePreview(dataUrl);
        };
        reader.readAsDataURL(file);
        this.value = '';
    });
    emojiInput.addEventListener('input', function() {
        const emoji = this.value.trim();
        hiddenInput.value = emoji;
        if (!emoji) hiddenInput.value = '📦';
        updateProductImagePreview(hiddenInput.value || '📦');
    });
}

// Save product (gọi API Node.js để lưu vào file data/products.json)
async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        price: parseInt(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value) >= 0 ? parseInt(document.getElementById('productQuantity').value) : 0,
        image: document.getElementById('productImage').value.trim() || '📦',
        description: document.getElementById('productDescription').value.trim(),
        featured: document.getElementById('productFeatured').checked
    };
    
    const API_BASE = window.location.origin;
    
    try {
        if (editingProductId) {
            const response = await fetch(`${API_BASE}/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Cập nhật thất bại');
            const updated = await response.json();
            const products = getProducts();
            const index = products.findIndex(p => p.id === parseInt(productId));
            if (index !== -1) products[index] = updated;
            else products.push(updated);
            saveProductsToCache(products);
            showNotification('Đã cập nhật sản phẩm thành công!');
        } else {
            const response = await fetch(`${API_BASE}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Thêm mới thất bại');
            const newProduct = await response.json();
            const products = getProducts();
            products.push(newProduct);
            saveProductsToCache(products);
            showNotification('Đã thêm sản phẩm mới thành công!');
        }
        renderAdminProductsList();
        closeProductForm();
    } catch (err) {
        console.error(err);
        showNotification('Lỗi: ' + (err.message || 'Vui lòng chạy server Node.js (npm start)'));
        // Fallback: chỉ lưu localStorage (không lưu file)
        const products = getProducts();
        if (editingProductId) {
            const index = products.findIndex(p => p.id === parseInt(productId));
            if (index !== -1) {
                products[index] = { ...products[index], ...productData, quantity: productData.quantity ?? products[index].quantity ?? 0 };
                saveProductsToCache(products);
                showNotification('Đã cập nhật (chỉ cache - chạy npm start để lưu file)');
            }
        } else {
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            products.push({ id: newId, ...productData, quantity: productData.quantity ?? 0 });
            saveProductsToCache(products);
            showNotification('Đã thêm (chỉ cache - chạy npm start để lưu file)');
        }
        renderAdminProductsList();
        closeProductForm();
    }
}

// Delete product (gọi API Node.js để xóa, đánh lại số thứ tự và cập nhật file)
async function deleteProduct(productId) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
        return;
    }
    
    const API_BASE = window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/api/products/${productId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Xóa thất bại');
        
        const data = await response.json();
        const products = data.products || getProducts().filter(p => p.id !== productId);
        const idMapping = data.idMapping || {}; // id cũ -> id mới (sau khi đánh lại)

        saveProductsToCache(products);

        // Cập nhật giỏ hàng: bỏ sản phẩm đã xóa, đổi id cũ sang id mới cho các mục còn lại
        const cart = getCart();
        const newCart = cart
            .filter(item => item.id !== productId)
            .map(item => ({
                ...item,
                id: idMapping[item.id] !== undefined ? idMapping[item.id] : item.id
            }));
        saveCart(newCart);
        
        renderAdminProductsList();
        showNotification('Đã xóa sản phẩm thành công!');
    } catch (err) {
        console.error(err);
        showNotification('Lỗi: ' + (err.message || 'Vui lòng chạy server Node.js (npm start)'));
        // Fallback: xóa khỏi cache và đánh lại id 1, 2, 3, ...
        let products = getProducts().filter(p => p.id !== productId);
        const idMapping = {};
        products.forEach((p, i) => {
            const oldId = p.id;
            const newId = i + 1;
            if (oldId !== newId) idMapping[oldId] = newId;
            p.id = newId;
        });
        saveProductsToCache(products);
        const cart = getCart();
        const newCart = cart
            .filter(item => item.id !== productId)
            .map(item => ({ ...item, id: idMapping[item.id] !== undefined ? idMapping[item.id] : item.id }));
        saveCart(newCart);
        renderAdminProductsList();
        showNotification('Đã xóa khỏi cache (chạy npm start để lưu file)');
    }
}

// Setup admin filters
function setupAdminFilters() {
    const searchInput = document.getElementById('adminSearch');
    const categoryFilter = document.getElementById('adminCategoryFilter');
    
    if (!searchInput || !categoryFilter) return;
    
    function applyFilters() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const category = categoryFilter.value;
        
        const products = getProducts();
        let filtered = products;
        
        if (searchTerm) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }
        
        if (category) {
            filtered = filtered.filter(product => product.category === category);
        }
        
        renderAdminProductsList(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    
    const searchBtn = document.querySelector('.admin-controls .search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }
}

// Export products to JSON file
function exportProducts() {
    const products = getProducts();
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Đã xuất file JSON thành công!');
}

// Import products from JSON file
function importProducts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedProducts = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedProducts)) {
                alert('File JSON không hợp lệ! File phải chứa một mảng sản phẩm.');
                return;
            }
            
            // Validate products structure
            const validProducts = importedProducts.filter(product => 
                product.name && product.category && typeof product.price === 'number'
            );
            
            if (validProducts.length === 0) {
                alert('Không có sản phẩm hợp lệ trong file!');
                return;
            }
            
            if (confirm(`Bạn có muốn thay thế toàn bộ sản phẩm hiện tại bằng ${validProducts.length} sản phẩm từ file?\n\nLưu ý: Hành động này không thể hoàn tác!`)) {
                validProducts.forEach((product, index) => {
                    if (!product.id) product.id = index + 1;
                });
                
                const API_BASE = window.location.origin;
                fetch(`${API_BASE}/api/products/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(validProducts)
                }).then(res => {
                    if (res.ok) {
                        saveProductsToCache(validProducts);
                        renderAdminProductsList();
                        showNotification(`Đã nhập ${validProducts.length} sản phẩm và lưu vào file!`);
                    } else {
                        saveProductsToCache(validProducts);
                        renderAdminProductsList();
                        showNotification(`Đã nhập ${validProducts.length} sản phẩm (cache). Chạy npm start để lưu file.`);
                    }
                }).catch(() => {
                    saveProductsToCache(validProducts);
                    renderAdminProductsList();
                    showNotification(`Đã nhập ${validProducts.length} sản phẩm (cache). Chạy npm start để lưu file.`);
                });
            }
        } catch (error) {
            alert('Lỗi khi đọc file JSON: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeProductForm();
    }
}

// ========== Doanh thu ==========
function switchAdminTab(tab) {
    const productsSection = document.getElementById('adminProductsSection');
    const productsHeader = document.getElementById('adminProductsHeader');
    const revenueSection = document.getElementById('adminRevenueSection');
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'products') {
        if (productsSection) productsSection.style.display = 'block';
        if (productsHeader) productsHeader.style.display = 'flex';
        if (revenueSection) revenueSection.style.display = 'none';
    } else {
        if (productsSection) productsSection.style.display = 'none';
        if (productsHeader) productsHeader.style.display = 'none';
        if (revenueSection) revenueSection.style.display = 'block';
        loadRevenue();
    }
}

async function loadRevenue() {
    const API_BASE = window.location.origin;
    let orders = [];
    try {
        const res = await fetch(`${API_BASE}/api/orders`);
        if (res.ok) orders = await res.json();
    } catch (e) {
        orders = JSON.parse(localStorage.getItem('orders') || '[]');
    }
    const totalRevenue = orders.reduce((sum, o) => sum + (parseInt(o.total) || 0), 0);
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalOrders').textContent = orders.length;
    const tbody = document.getElementById('adminOrdersList');
    const noOrders = document.getElementById('adminNoOrders');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '';
        if (noOrders) noOrders.style.display = 'block';
        return;
    }
    if (noOrders) noOrders.style.display = 'none';
    const products = getProducts();
    tbody.innerHTML = orders.slice().reverse().map(order => {
        const date = order.date ? new Date(order.date).toLocaleString('vi-VN') : '-';
        const itemsText = (order.items || []).map(item => {
            const p = products.find(pr => pr.id === item.id);
            const name = p ? p.name : 'SP #' + item.id;
            return `${name} x${item.quantity || 0}`;
        }).join(', ') || '-';
        return `
            <tr>
                <td>#${order.id}</td>
                <td>${date}</td>
                <td class="order-items-cell">${itemsText}</td>
                <td class="order-total-cell">${formatCurrency(order.total || 0)}</td>
            </tr>
        `;
    }).join('');
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'products.html';
    if (currentPage === 'admin.html') {
        loadAdminPage();
    }
});
