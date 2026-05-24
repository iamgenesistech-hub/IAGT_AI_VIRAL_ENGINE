const supabase = require('../utils/supabaseConnector');

class SupabaseSessionStorage {
  async storeSession(session) {
    const { error } = await supabase
      .from('shopify_sessions')
      .upsert({
        id: session.id,
        shop: session.shop,
        state: session.state || null,
        is_online: session.isOnline || false,
        scope: session.scope || null,
        access_token: session.accessToken || null,
        expires: session.expires ? session.expires.toISOString() : null,
        online_access_info: session.onlineAccessInfo || null,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Supabase storeSession error:', error.message);
      return false;
    }

    return true;
  }

  async loadSession(id) {
    const { data, error } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      shop: data.shop,
      state: data.state,
      isOnline: data.is_online,
      scope: data.scope,
      accessToken: data.access_token,
      expires: data.expires ? new Date(data.expires) : undefined,
      onlineAccessInfo: data.online_access_info
    };
  }

  async deleteSession(id) {
    const { error } = await supabase
      .from('shopify_sessions')
      .delete()
      .eq('id', id);

    return !error;
  }

  async deleteSessions(ids) {
    const { error } = await supabase
      .from('shopify_sessions')
      .delete()
      .in('id', ids);

    return !error;
  }

  async findSessionsByShop(shop) {
    const { data, error } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('shop', shop);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      shop: row.shop,
      state: row.state,
      isOnline: row.is_online,
      scope: row.scope,
      accessToken: row.access_token,
      expires: row.expires ? new Date(row.expires) : undefined,
      onlineAccessInfo: row.online_access_info
    }));
  }
}

module.exports = SupabaseSessionStorage;