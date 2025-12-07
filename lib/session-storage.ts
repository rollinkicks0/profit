import { ShopifySession } from './shopify';
import { supabaseServer } from './supabase-server';

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
      const { error } = await supabaseServer
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
      const { data, error } = await supabaseServer
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
      const { error } = await supabaseServer
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
      console.log('🔍 [SESSION] Looking up sessions for shop:', shop);
      console.log('🔍 [SESSION] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
      console.log('🔍 [SESSION] Supabase key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data, error } = await supabaseServer
        .from('shopify_sessions')
        .select('*')
        .eq('shop', shop)
        .order('created_at', { ascending: false });

      console.log('🔍 [SESSION] Query completed. Error:', error, 'Data length:', data?.length);

      if (error) {
        console.error('❌ [SESSION] Supabase error:', error);
        console.error('❌ [SESSION] Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      if (!data || data.length === 0) {
        console.log('⚠️ [SESSION] No sessions found for shop:', shop);
        console.log('⚠️ [SESSION] Query returned:', data);
        return [];
      }

      console.log(`✅ [SESSION] Found ${data.length} session(s) for shop:`, shop);
      console.log('[SESSION] First session details:', {
        id: data[0].id,
        shop: data[0].shop,
        hasToken: !!data[0].access_token,
        tokenPrefix: data[0].access_token?.substring(0, 10) + '...',
        scope: data[0].scope,
      });

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
      console.error('❌ [SESSION] Exception finding sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions (optional - can be run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabaseServer
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
