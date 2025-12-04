import { ShopifySession } from './shopify';

// Simple in-memory session storage for now
// TODO: Replace with Supabase when ready
class SessionStorage {
  private sessions: Map<string, ShopifySession>;

  constructor() {
    this.sessions = new Map();
  }

  async storeSession(session: ShopifySession): Promise<boolean> {
    this.sessions.set(session.id, session);
    return true;
  }

  async loadSession(id: string): Promise<ShopifySession | undefined> {
    return this.sessions.get(id);
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async findSessionsByShop(shop: string): Promise<ShopifySession[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.shop === shop
    );
  }
}

export const sessionStorage = new SessionStorage();

