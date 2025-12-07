import { ShopifySession } from './shopify';
import { supabase } from './supabase';

/**
 * Persistent Session Storage using Supabase
 * Replaces in-memory storage to fix session expiration issues on Vercel
 */
class SessionStorage {
  /**
   * Store a session in Supabase
   */
  async storeSession(session: ShopifySession): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shopify_sessions')
        .upsert({
          id: session.id,
          shop: session.shop,
          state: session.state,
          access_token: session.accessToken,
          is_online: session.isOnline,
          scope: session.scope,
          expires_at: session.expiresAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Error storing session:', error);
        return false;
      }

      console.log('✅ Session stored successfully:', session.id);
      return true;
    } catch (error) {
      console.error('❌ Exception storing session:', error);
      return false;
    }
  }

  /**
   * Load a session by ID from Supabase
   */
  async loadSession(id: string): Promise<ShopifySession | undefined> {
    try {
      const { data, error } = await supabase
        .from('shopify_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.log('⚠️ Session not found:', id);
        return undefined;
      }

      return {
        id: data.id,
        shop: data.shop,
        state: data.state || '',
        accessToken: data.access_token,
        isOnline: data.is_online,
        scope: data.scope,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('❌ Error loading session:', error);
      return undefined;
    }
  }

  /**
   * Delete a session from Supabase
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shopify_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting session:', error);
        return false;
      }

      console.log('🗑️ Session deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Exception deleting session:', error);
      return false;
    }
  }

  /**
   * Find all sessions for a specific shop
   */
  async findSessionsByShop(shop: string): Promise<ShopifySession[]> {
    try {
      const { data, error } = await supabase
        .from('shopify_sessions')
        .select('*')
        .eq('shop', shop)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.log('⚠️ No sessions found for shop:', shop);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        shop: row.shop,
        state: row.state || '',
        accessToken: row.access_token,
        isOnline: row.is_online,
        scope: row.scope,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      console.error('❌ Error finding sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions (optional - can be run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('shopify_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        console.error('❌ Error cleaning up sessions:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`🧹 Cleaned up ${count} expired sessions`);
      return count;
    } catch (error) {
      console.error('❌ Exception cleaning up sessions:', error);
      return 0;
    }
  }
}

export const sessionStorage = new SessionStorage();
