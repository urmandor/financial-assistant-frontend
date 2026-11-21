import { apiFetch } from './client';

export async function sendChatMessage(message, history = []) {
  return apiFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
}

export async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append('receipt', file);
  return apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
}
