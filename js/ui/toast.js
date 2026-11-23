export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:var(--z-toast);display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  const colors = { success: 'var(--color-success)', error: 'var(--color-danger)', info: 'var(--color-accent)' };
  const toast = document.createElement('div');
  toast.className = 'glass';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = `
    padding:12px 20px;border-radius:var(--radius-lg);color:var(--color-text);
    font-size:var(--text-base);font-family:var(--font-family);box-shadow:var(--shadow-md);
    border-left:3px solid ${colors[type] || colors.info};pointer-events:auto;
    opacity:0;transform:translateY(16px);transition:all var(--duration-normal) var(--ease-spring);
    max-width:360px;
  `;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px)';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}
