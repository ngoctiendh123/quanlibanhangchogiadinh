// Đăng nhập / đăng ký: tự nhận biết admin hay khách theo tài khoản + mật khẩu.
// Admin chỉ có 1 tài khoản (cấu hình server), không có form/API đăng ký admin; form Đăng ký chỉ dành cho khách hàng.

// Bật/tắt hiển thị mật khẩu (icon con mắt)
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁';
    btn.title = isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
    btn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || '';

    const loginModeBtn = document.getElementById('loginModeBtn');
    const registerModeBtn = document.getElementById('registerModeBtn');
    const unifiedLoginForm = document.getElementById('unifiedLoginForm');
    const customerRegisterForm = document.getElementById('customerRegisterForm');
    const authErrorEl = document.getElementById('authError');
    const customerGoogleBtn = document.getElementById('customerGoogleBtn');

    function setMode(mode) {
        if (mode === 'register') {
            registerModeBtn.classList.add('active');
            loginModeBtn.classList.remove('active');
            customerRegisterForm.style.display = '';
            unifiedLoginForm.style.display = 'none';
        } else {
            loginModeBtn.classList.add('active');
            registerModeBtn.classList.remove('active');
            unifiedLoginForm.style.display = '';
            customerRegisterForm.style.display = 'none';
        }
        if (authErrorEl) {
            authErrorEl.style.display = 'none';
            authErrorEl.textContent = '';
        }
    }

    if (loginModeBtn && registerModeBtn) {
        loginModeBtn.addEventListener('click', () => setMode('login'));
        registerModeBtn.addEventListener('click', () => setMode('register'));
    }

    // Nếu từ trang đăng ký chuyển hướng với ?registered=1 thì hiện thông báo đăng nhập
    if (urlParams.get('registered') === '1') {
        setMode('login');
        if (authErrorEl) {
            authErrorEl.style.color = 'var(--primary-color)';
            authErrorEl.style.display = 'block';
            authErrorEl.textContent = 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.';
        }
    }

    // Nếu đã đăng nhập sẵn thì chuyển hướng luôn
    try {
        const meRes = await fetch(`${API_BASE}/api/me`);
        if (meRes.ok) {
            const user = await meRes.json();
            if (user.role === 'admin') {
                window.location.href = redirect || 'admin.html';
                return;
            }
            if (user.role === 'customer') {
                window.location.href = redirect || 'products.html';
                return;
            }
        }
    } catch (e) {
        // ignore
    }

    // Xử lý đăng nhập (admin hoặc khách)
    if (unifiedLoginForm) {
        unifiedLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginIdentifier').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (authErrorEl) {
                authErrorEl.style.display = 'none';
                authErrorEl.textContent = '';
            }

            try {
                // 1. Thử đăng nhập admin
                let res = await fetch(`${API_BASE}/api/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: identifier, password })
                });

                if (res.ok) {
                    showNotification('Đăng nhập admin thành công!');
                    window.location.href = redirect || 'admin.html';
                    return;
                }

                // 2. Không phải admin, thử đăng nhập khách bằng số điện thoại hoặc email
                res = await fetch(`${API_BASE}/api/customer/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });

                if (res.ok) {
                    showNotification('Đăng nhập khách hàng thành công!');
                    window.location.href = redirect || 'products.html';
                    return;
                }

                const data = await res.json().catch(() => ({}));
                if (authErrorEl) {
                    authErrorEl.textContent = data.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
                    authErrorEl.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                if (authErrorEl) {
                    authErrorEl.textContent = 'Không kết nối được server. Vui lòng chạy npm start.';
                    authErrorEl.style.display = 'block';
                }
            }
        });
    }

    // Xử lý đăng ký khách hàng (chỉ username + password)
    if (customerRegisterForm) {
        customerRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameEl = document.getElementById('customerUsername');
            const passwordEl = document.getElementById('customerPassword');
            const username = usernameEl ? usernameEl.value.trim() : '';
            const password = passwordEl ? passwordEl.value : '';
            if (authErrorEl) {
                authErrorEl.style.display = 'none';
                authErrorEl.textContent = '';
            }
            if (!username || !password) {
                if (authErrorEl) {
                    authErrorEl.textContent = 'Vui lòng nhập tên tài khoản (SĐT hoặc email) và mật khẩu.';
                    authErrorEl.style.display = 'block';
                }
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/customer/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (authErrorEl) {
                        authErrorEl.textContent = data.error || 'Đăng ký thất bại.';
                        authErrorEl.style.display = 'block';
                    }
                    return;
                }
                // Đăng ký xong không vào luôn — chuyển sang form đăng nhập, bắt buộc đăng nhập lại.
                if (authErrorEl) {
                    authErrorEl.style.display = 'none';
                    authErrorEl.textContent = '';
                }
                setMode('login');
                if (authErrorEl) {
                    authErrorEl.style.color = 'var(--primary-color)';
                    authErrorEl.textContent = 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.';
                    authErrorEl.style.display = 'block';
                }
                if (typeof showNotification === 'function') showNotification('Đăng ký thành công. Vui lòng đăng nhập.');
            } catch (err) {
                console.error(err);
                if (authErrorEl) {
                    authErrorEl.textContent = 'Không kết nối được server. Vui lòng chạy npm start.';
                    authErrorEl.style.display = 'block';
                }
            }
        });
    }

    // Đăng nhập Google demo
    if (customerGoogleBtn) {
        customerGoogleBtn.addEventListener('click', async () => {
            if (authErrorEl) {
                authErrorEl.style.display = 'none';
                authErrorEl.textContent = '';
            }
            const demoEmail = `user_${Date.now()}@example.com`;
            try {
                const res = await fetch(`${API_BASE}/api/customer/google-login-demo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: demoEmail, name: 'Khách Google' })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (authErrorEl) {
                        authErrorEl.textContent = data.error || 'Đăng nhập Google demo thất bại.';
                        authErrorEl.style.display = 'block';
                    }
                    return;
                }
                showNotification('Đăng nhập Google (demo) thành công!');
                window.location.href = redirect || 'products.html';
            } catch (err) {
                console.error(err);
                if (authErrorEl) {
                    authErrorEl.textContent = 'Không kết nối được server. Vui lòng chạy npm start.';
                    authErrorEl.style.display = 'block';
                }
            }
        });
    }
});

