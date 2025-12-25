/**
 * EchoPath Extension - Simple Login Popup
 */

// API_BASE is imported from config.js (loaded via popup.html)

console.log('🌐 [EchoPath Popup] Loaded');

// Check if already logged in when popup opens
document.addEventListener('DOMContentLoaded', checkLoginStatus);

// Login button
document.getElementById('login-btn').addEventListener('click', handleLogin);

// Logout button  
document.getElementById('logout-btn').addEventListener('click', handleLogout);

/**
 * Check if user is already logged in
 */
async function checkLoginStatus() {
  console.log('🔍 [EchoPath] Checking login status...');

  const { authToken, userName, userEmail } = await chrome.storage.local.get(['authToken', 'userName', 'userEmail']);

  if (authToken) {
    console.log('✅ [EchoPath] User is logged in');
    showLoggedInView(userName, userEmail);
  } else {
    console.log('❌ [EchoPath] User is NOT logged in');
    showLoginForm();
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const extension_id = document.getElementById('extension-id').value.trim();
  const extension_pass = document.getElementById('extension-pass').value.trim();

  if (!extension_id || !extension_pass) {
    showStatus('Please enter Extension ID and Password', 'error');
    return;
  }

  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const response = await fetch(`${API_BASE}/api/auth/extension-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extension_id, extension_pass })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Store credentials and token
      await chrome.storage.local.set({
        authToken: data.token,
        userId: data.user?.id,
        userName: data.user?.name || 'User',
        userEmail: data.user?.email || ''
      });

      showStatus('✅ Login successful!', 'success');

      setTimeout(() => {
        showLoggedInView(data.user?.name, data.user?.email);
      }, 1000);
    } else {
      showStatus(`❌ ${data.message || 'Login failed'}`, 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  } catch (error) {
    console.error('Login error:', error);
    showStatus('❌ Cannot connect to backend', 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  await chrome.storage.local.clear();
  showLoginForm();
  showStatus('Logged out successfully', 'info');
}

/**
 * Show login form
 */
function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('logged-in-view').style.display = 'none';
  document.getElementById('extension-id').value = '';
  document.getElementById('extension-pass').value = '';
  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-btn').textContent = 'Login';
}

/**
 * Show logged in view
 */
function showLoggedInView(name, email) {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('logged-in-view').style.display = 'block';
  document.getElementById('user-name').textContent = name || 'User';
  document.getElementById('user-email').textContent = email || '';
}

/**
 * Show status message
 */
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type} show`;

  setTimeout(() => {
    status.classList.remove('show');
  }, 4000);
}
