// popup.js
const toggle = document.getElementById('enableToggle');
const dot = document.getElementById('statusDot');
const statusText = document.getElementById('status-text');

function updateUI(enabled) {
  toggle.checked = enabled;
  if (enabled) {
    dot.classList.remove('off');
    statusText.textContent = 'Active — PDFs will be renamed';
  } else {
    dot.classList.add('off');
    statusText.textContent = 'Paused — using browser defaults';
  }
}

// Load saved setting
chrome.storage.sync.get({ enabled: true }, ({ enabled }) => updateUI(enabled));

// Save on change
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  updateUI(enabled);
});
