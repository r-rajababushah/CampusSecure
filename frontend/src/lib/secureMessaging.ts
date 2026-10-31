import { apiRequest } from './api.js';

const STORAGE_KEY = 'campus_message_transport_key';
const TRANSPORT_PREFIX = 'TRANSPORT:AES-GCM:';
const RSA_LABEL = new TextEncoder().encode('securecampus_transport_key_v1');
const AAD = new TextEncoder().encode('securecampus_transport_v1');

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function getTransportKey(): Promise<CryptoKey> {
  let encoded = sessionStorage.getItem(STORAGE_KEY);
  if (!encoded) {
    const { publicKey } = await apiRequest<{ publicKey: string }>('/api/v1/messages/crypto/public-key');
    const pem = publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
    const rsaKey = await crypto.subtle.importKey('spki', fromBase64(pem), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP', label: RSA_LABEL }, rsaKey, raw);
    await apiRequest('/api/v1/messages/secure-channel', {
      method: 'POST', body: { wrappedKey: toBase64(new Uint8Array(wrapped)) },
    });
    encoded = toBase64(raw);
    sessionStorage.setItem(STORAGE_KEY, encoded);
  }
  return crypto.subtle.importKey('raw', fromBase64(encoded), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptMessageForTransport(plaintext: string): Promise<string> {
  const key = await getTransportKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, new TextEncoder().encode(plaintext));
  return `${TRANSPORT_PREFIX}${toBase64(new TextEncoder().encode(JSON.stringify({
    scheme: 'AES-256-GCM', nonce: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)),
  })))}`;
}

export async function decryptMessageFromTransport(envelope: string): Promise<string> {
  if (!envelope.startsWith(TRANSPORT_PREFIX)) return envelope;
  const key = await getTransportKey();
  const payload = JSON.parse(new TextDecoder().decode(fromBase64(envelope.slice(TRANSPORT_PREFIX.length))));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.nonce), additionalData: AAD }, key, fromBase64(payload.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export function clearMessageTransportKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
