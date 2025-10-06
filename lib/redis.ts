// lib/redis.ts
import { createClient, VercelKV } from '@vercel/kv';

// Define the KV interface with all required methods
interface KV {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: { ex?: number }): Promise<string>;
  setRateLimit(key: string, resetTime: number): Promise<void>;
  isRateLimited(key: string): Promise<boolean>;
  del(key: string): Promise<number>;
}

// In-memory fallback cache implementation
const createInMemoryKV = (): KV => {
  const cache = new Map<string, { value: any; expires: number }>();
  
  return {
    get: async <T = any>(key: string): Promise<T | null> => {
      const item = cache.get(key);
      if (!item) return null;
      if (item.expires < Date.now()) {
        cache.delete(key);
        return null;
      }
      return item.value as T;
    },
    
    set: async (key: string, value: any, options?: { ex?: number }): Promise<string> => {
      cache.set(key, {
        value,
        expires: options?.ex ? Date.now() + options.ex * 1000 : Date.now() + 1000 * 60 * 5,
      });
      return 'OK';
    },
    
    setRateLimit: async (key: string, resetTime: number): Promise<void> => {
      const ttl = Math.ceil((resetTime * 1000 - Date.now()) / 1000);
      if (ttl > 0) {
        // Store the reset time in the cache
        await cache.set(`rate_limit:${key}`, {
          value: resetTime.toString(),
          expires: resetTime * 1000
        });
      }
    },

    isRateLimited: async (key: string): Promise<boolean> => {
      const item = await cache.get(`rate_limit:${key}`);
      if (!item) return false;
      return item.expires > Date.now();
    },

    
    del: async (key: string): Promise<number> => {
      return cache.delete(key) ? 1 : 0;
    }
  };
};

// Create a wrapper for Vercel KV to add our custom methods
const createVercelKV = (): KV => {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('Missing Vercel KV configuration');
  }
  
  const client = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  }) as VercelKV & KV;
  
  // Add our custom methods
  client.setRateLimit = async (key: string, resetTime: number): Promise<void> => {
    const ttl = Math.ceil((resetTime * 1000 - Date.now()) / 1000);
    if (ttl > 0) {
      await client.set(`rate_limit:${key}`, '1', { ex: ttl });
    }
  };
  
  client.isRateLimited = async (key: string): Promise<boolean> => {
    return (await client.get(`rate_limit:${key}`)) !== null;
  };
  
  return client;
};

// Initialize the KV client
let kv: KV;

try {
  kv = createVercelKV();
  console.log('Using Vercel KV for caching');
} catch (error) {
  console.warn('Failed to initialize Vercel KV, falling back to in-memory cache:', error);
  kv = createInMemoryKV();
}

export default kv;