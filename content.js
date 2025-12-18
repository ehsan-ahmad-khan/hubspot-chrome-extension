/**
 * EchoPath - Simple Button Version
 * Shows button → Extracts contacts → Sends to backend
 */

console.log('🚀 [EchoPath] Content script loaded');

const API_BASE = 'http://localhost:5000';
let sendButton = null;

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('✅ [EchoPath] Initializing...');

  // Create the send button
  createSendButton();

  // Check for selected contacts every second
  setInterval(updateButton, 1000);
}

/**
 * Create the floating send button
 */
function createSendButton() {
  sendButton = document.createElement('button');
  sendButton.id = 'echopath-send-btn';
  sendButton.innerHTML = '📞 Send to EchoPath (<span id="count">0</span>)';
  sendButton.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 50px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    z-index: 999999;
    display: none;
    transition: transform 0.2s;
  `;

  sendButton.onmouseover = () => sendButton.style.transform = 'translateY(-2px)';
  sendButton.onmouseout = () => sendButton.style.transform = 'translateY(0)';
  sendButton.onclick = handleSend;

  document.body.appendChild(sendButton);
  console.log('✅ [EchoPath] Button created');
}

/**
 * Update button visibility based on selection
 */
function updateButton() {
  const contacts = extractContacts();
  const count = contacts.length;

  if (count > 0) {
    sendButton.style.display = 'block';
    document.getElementById('count').textContent = count;
  } else {
    sendButton.style.display = 'none';
  }
}

/**
 * Extract selected contacts
 */
function extractContacts() {
  console.log('🔍 [EchoPath] Extracting contacts...');

  const contacts = [];
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');

  console.log(`� Found ${checkboxes.length} checked checkboxes`);

  checkboxes.forEach((checkbox, index) => {
    const row = checkbox.closest('tr');
    if (!row || row.closest('thead')) return;

    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;

    let name = null;
    let email = null;
    let phone = null;

    // Extract data from each cell
    cells.forEach(cell => {
      const text = cell.textContent.trim();

      // Email
      if (text.includes('@') && !email) {
        const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) email = match[0];
      }

      // Phone
      if (text.match(/[\d\s\-\+\(\)]{10,}/) && !phone) {
        const match = text.match(/\+?[\d\s\-\(\)]{10,}/);
        if (match) phone = match[0].replace(/\s/g, '');
      }

      // Name (not email, not phone, not empty)
      if (!name && text.length > 1 && text !== '--' && !text.includes('@')) {
        if (text.match(/^[a-zA-Z\s'-]+$/) && text.length < 50) {
          name = text;
        }
      }
    });

    // Only add if has phone
    if (phone) {
      contacts.push({
        name: name || 'Unknown',
        email: email || null,
        phone: phone
      });
      console.log(`✅ Contact ${contacts.length}:`, { name, email, phone });
    } else {
      console.log(`⏭️ Skipping row ${index} - no phone`);
    }
  });

  console.log(`🎯 Extracted ${contacts.length} contacts`);
  return contacts;
}

/**
 * Send contacts to backend
 */
async function handleSend() {
  console.log('📤 [EchoPath] Send button clicked');

  const contacts = extractContacts();

  if (contacts.length === 0) {
    showToast('⚠️ No contacts with phone numbers selected', 'warning');
    return;
  }

  // Disable button
  sendButton.disabled = true;
  sendButton.textContent = 'Sending...';

  try {
    // Get auth token
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) {
      showToast('❌ Please login to the extension first', 'error');
      sendButton.disabled = false;
      sendButton.innerHTML = '📞 Send to EchoPath (<span id="count">' + contacts.length + '</span>)';
      return;
    }

    console.log('🔐 Got auth token, sending request...');

    // Send to backend
    const response = await fetch(`${API_BASE}/api/hubspot/extension/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contacts })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const count = data.validContacts || contacts.length;
      showToast(`✅ Successfully sent ${count} contacts!`, 'success');
      console.log('✅ Success:', data);
    } else if (response.status === 401) {
      showToast('❌ Session expired - please login again', 'error');
    } else {
      showToast(`❌ ${data.message || 'Failed to send'}`, 'error');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    showToast('❌ Failed to connect to backend', 'error');
  } finally {
    sendButton.disabled = false;
    const count = extractContacts().length;
    sendButton.innerHTML = `📞 Send to EchoPath (<span id="count">${count}</span>)`;
  }
}

/**
 * Show toast notification
 */
function showToast(message, type) {
  const existing = document.getElementById('echopath-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'echopath-toast';
  toast.textContent = message;

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b'
  };

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('✅ [EchoPath] Ready!');
