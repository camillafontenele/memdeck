import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomSecret = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('base64url');
export const isSecret = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}

// Single process only. Keys are hashes; consumption has no await between read/delete.
export class OneTimeStore<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  constructor(private ttl: number, private capacity = 5000, private now = () => Date.now()) {}
  put(secret: string, value: T) {
    this.prune();
    if (this.entries.size >= this.capacity) throw new Error('OAuth capacity reached');
    this.entries.set(digest(secret), { value, expires: this.now() + this.ttl });
  }
  take(secret: string): T | undefined {
    const key = digest(secret);
    const entry = this.entries.get(key);
    this.entries.delete(key);
    return entry && entry.expires > this.now() ? entry.value : undefined;
  }
  prune() {
    for (const [key, entry] of this.entries) if (entry.expires <= this.now()) this.entries.delete(key);
  }
  clear() { this.entries.clear(); }
}
