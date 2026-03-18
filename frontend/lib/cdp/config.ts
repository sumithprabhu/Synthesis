import { Coinbase } from '@coinbase/coinbase-sdk';

let configured = false;

export function ensureConfigured(): void {
  if (configured) return;
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
  if (!apiKeyName || !privateKey) {
    throw new Error('CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set');
  }
  Coinbase.configure({
    apiKeyName,
    privateKey: privateKey.trim(),
    useServerSigner: false,
  });
  configured = true;
}
