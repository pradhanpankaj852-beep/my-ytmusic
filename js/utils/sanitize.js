/**
 * sanitize.js — Defensive security utilities for XSS prevention and secret masking
 */

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

export function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 10) return '••••••••';
  return key.slice(0, 6) + '•'.repeat(16) + key.slice(-4);
}
