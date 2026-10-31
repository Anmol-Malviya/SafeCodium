/**
 * Cookie Management Utilities for Safe Vibe AI
 * Handles client-side persistent state, user preferences, and session tokens.
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export const cookieManager = {
  /**
   * Set a cookie key-value pair with options
   */
  set: (name: string, value: string, options: CookieOptions = {}): void => {
    const { days = 7, path = '/', secure = false, sameSite = 'Lax' } = options;
    let expires = '';

    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = `; expires=${date.toUTCString()}`;
    }

    const secureFlag = secure ? '; Secure' : '';
    const sameSiteFlag = `; SameSite=${sameSite}`;

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || '')}${expires}; path=${path}${secureFlag}${sameSiteFlag}`;
  },

  /**
   * Get a cookie value by key
   */
  get: (name: string): string | null => {
    const nameEQ = `${encodeURIComponent(name)}=`;
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  },

  /**
   * Remove a cookie by key
   */
  remove: (name: string, path: string = '/'): void => {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=-99999999; path=${path}`;
  },

  /**
   * Check if a cookie exists
   */
  has: (name: string): boolean => {
    return cookieManager.get(name) !== null;
  },

  /**
   * Get parsed JSON from cookie
   */
  getJSON: <T>(name: string): T | null => {
    try {
      const raw = cookieManager.get(name);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  /**
   * Save JSON into cookie
   */
  setJSON: <T>(name: string, value: T, options?: CookieOptions): void => {
    cookieManager.set(name, JSON.stringify(value), options);
  },
};

