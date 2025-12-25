/**
 * EchoPath - Simple Button Version
 * Shows button → Extracts contacts → Sends to backend
 */

console.log('🚀 [EchoPath] Content script loaded');

// API_BASE is imported from config.js (loaded first in manifest.json)
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
    const countElement = document.getElementById('count');
    if (countElement) {
      countElement.textContent = count;
    }
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
    // IMPORTANT: Extract email FIRST to avoid duplication issues
    cells.forEach(cell => {
      // 1. Extract EMAIL from editable cell (HubSpot pattern)
      if (!email) {
        // Check if this is an editable email cell
        if (cell.hasAttribute('data-onboarding') && cell.getAttribute('data-onboarding') === 'contact-email-cell') {
          // Look for the truncated label inside
          const emailDiv = cell.querySelector('[data-test-id="truncated-object-label"]');
          if (emailDiv) {
            // Try to find the mailto link first
            const emailLink = emailDiv.querySelector('a[href^="mailto:"]');
            if (emailLink) {
              // Get text content from the link (cleaner than href)
              const linkText = emailLink.textContent.trim();
              // Remove any trailing icons or text
              const cleanEmail = linkText.replace(/\s*Link opens.*$/i, '').trim();
              if (cleanEmail && cleanEmail.includes('@')) {
                email = cleanEmail;
                console.log(`📧 Found email from editable cell link text: ${email}`);
              }
            }
          }
        }
      }

      // 2. Extract EMAIL from name cell (when email is used as name)
      if (!email) {
        const isNameCell = cell.hasAttribute('data-onboarding') &&
          cell.getAttribute('data-onboarding') === 'contact-name-cell';
        if (isNameCell) {
          // Look for the specific span that contains the email (avoids avatar)
          const emailSpan = cell.querySelector('[data-test-id^="label-cell-unformatted-property"]');
          if (emailSpan) {
            const spanText = emailSpan.textContent.trim();
            if (spanText && spanText.includes('@')) {
              const match = spanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
              if (match) {
                email = match[0];
                console.log(`📧 Found email from name cell span: ${email}`);
              }
            }
          }
        }
      }

      // 3. Extract EMAIL from mailto link href (fallback)
      if (!email) {
        const emailLink = cell.querySelector('a[href^="mailto:"]');
        if (emailLink) {
          const mailtoHref = emailLink.getAttribute('href');
          email = mailtoHref.replace('mailto:', '').trim();
          console.log(`📧 Found email from mailto href: ${email}`);
        }
      }

      // 4. Fallback EMAIL extraction from text (with aggressive cleaning)
      // Only use this for cells without avatars to avoid contamination
      if (!email) {
        // Skip cells that have avatar components
        const hasAvatar = cell.querySelector('[data-test-id="AvatarDisplay-switchComponent"]');
        if (!hasAvatar) {
          let text = cell.textContent.trim();
          if (text.includes('@')) {
            // Remove common UI text that might be appended
            text = text.replace(/Preview$/i, '').replace(/Link opens in a new window$/i, '').trim();
            const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (match) {
              email = match[0];
              console.log(`📧 Found email from text (cleaned): ${email}`);
            }
          }
        }
      }

      // 3. Extract PHONE from text
      if (!phone) {
        const text = cell.textContent.trim();
        if (text.match(/[\d\s\-\+\(\)]{10,}/)) {
          const match = text.match(/\+?[\d\s\-\(\)]{10,}/);
          if (match) {
            phone = match[0].replace(/\s/g, '');
            console.log(`� Found phone: ${phone}`);
          }
        }
      }
    });

    // 4. Extract NAME separately (after email to avoid conflicts)
    cells.forEach(cell => {
      if (!name) {
        // Check if this is a name cell specifically
        const isNameCell = cell.hasAttribute('data-onboarding') &&
          cell.getAttribute('data-onboarding') === 'contact-name-cell';

        if (isNameCell) {
          // Look for the contact link
          const nameLink = cell.querySelector('a[href*="/contacts/"][href*="/record/"]');
          if (nameLink) {
            // Get the span inside the link that contains the actual name/email
            const innerSpan = nameLink.querySelector('[data-test-id^="label-cell-unformatted-property"]');
            if (innerSpan) {
              const linkText = innerSpan.textContent.trim();
              // Only use if it's not an email
              if (linkText && linkText.length > 0 && !linkText.includes('@')) {
                name = linkText;
                console.log(`🏷️  Found name from name cell: ${name}`);
              }
            }
          }
        }

        // Fallback: Look for label-cell-unformatted-property span in ANY cell
        if (!name) {
          const nameSpan = cell.querySelector('[data-test-id^="label-cell-unformatted-property"]');
          if (nameSpan) {
            const nameText = nameSpan.textContent.trim();
            // Make sure it's not an email address
            if (nameText && nameText.length > 0 && !nameText.includes('@')) {
              name = nameText;
              console.log(`🏷️  Found name from data-test-id span: ${name}`);
            }
          }
        }
      }
    });

    // Post-processing: If name is actually an email, set to Unknown
    if (name && name.includes('@')) {
      console.log(`⚠️  Name contains @, setting to Unknown: ${name}`);
      name = null;
    }

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
    // Get auth token from storage
    let authToken;
    try {
      const storage = await chrome.storage.local.get('authToken');
      authToken = storage.authToken;
    } catch (storageError) {
      // Extension context invalidated - user needs to refresh
      if (storageError.message.includes('Extension context invalidated')) {
        showToast('🔄 Extension updated! Please refresh this page and try again.', 'warning');
        sendButton.disabled = false;
        sendButton.innerHTML = '📞 Send to EchoPath (<span id="count">' + contacts.length + '</span>)';
        return;
      }
      throw storageError;
    }

    if (!authToken) {
      showToast('❌ Please login to the extension first', 'error');
      sendButton.disabled = false;
      sendButton.innerHTML = '📞 Send to EchoPath (<span id="count">' + contacts.length + '</span>)';
      return;
    }

    console.log(`📋 Sending ${contacts.length} contacts to echoPathAI backend...`);

    // Send to echoPathAI backend /api/hubspot/extension/submit endpoint
    const response = await fetch(`${API_BASE}/api/hubspot/extension/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`  // JWT authentication
      },
      body: JSON.stringify({ contacts })  // Direct contact format
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(`✅ ${data.message || 'Batch call initiated successfully!'}`, 'success');
      console.log('✅ Success:', data);
      console.log(`📞 Batch ID: ${data.batchId}`);
      console.log(`📊 Valid contacts: ${data.validContacts} / ${data.totalContacts}`);

      // Clear selections after successful send
      setTimeout(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => cb.checked = false);
      }, 1000);
    } else {
      const errorMsg = data.message || 'Failed to initiate batch call';
      showToast(`❌ ${errorMsg}`, 'error');
      console.error('❌ Error response:', data);

      // Check if re-authentication is required
      if (data.requiresReauth) {
        showToast('🔐 Please re-login to the extension', 'warning');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.message && error.message.includes('Extension context invalidated')) {
      showToast('🔄 Extension updated! Please refresh this page and try again.', 'warning');
    } else {
      showToast('❌ Failed to connect to backend. Is the server running?', 'error');
    }
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
