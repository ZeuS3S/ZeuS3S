// Branche le jeu sur Supabase quand il est hébergé hors de claude.ai.
// Le jeu parle à claude.use('db') et claude.use('user') : on fournit la même interface.
(() => {
  // Sans compte, la progression vit dans le navigateur : on demande qu'il ne l'efface pas pour faire de la place.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch (e) {}
  const cfg = window.COUPE_CONFIG;
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return; // pas configuré : le jeu tourne hors ligne
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let session = null;
  const ready = sb.auth.getSession().then(r => { session = r.data.session }).catch(() => {});
  const fail = e => ({ code: e && e.code === '42501' ? 'permission_denied' : 'unavailable', message: e && e.message || '' });
  const parent = path => path.split('/').slice(0, -1).join('/');

  const db = {
    doc: path => ({
      async get() {
        const { data, error } = await sb.from('docs').select('data').eq('path', path).maybeSingle();
        if (error) throw fail(error);
        return { exists: !!data, data: () => data && data.data };
      },
      async set(value) {
        const { error } = await sb.from('docs').upsert({ path, collection: parent(path), owner: session.user.id, data: value, updated_at: new Date().toISOString() });
        if (error) throw fail(error);
      }
    }),
    collection: name => ({
      onSnapshot(next, onError) {
        let alive = true;
        const load = async () => {
          const { data, error } = await sb.from('docs').select('path,data').eq('collection', name);
          if (!alive) return;
          if (error) return onError && onError(fail(error));
          const docs = data.map(r => ({ id: r.path.split('/').pop(), exists: true, data: () => r.data }));
          next({ docs, size: docs.length, empty: !docs.length });
        };
        load();
        const ch = sb.channel('docs-' + name + '-' + Math.random().toString(36).slice(2))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'collection=eq.' + name }, load).subscribe();
        return () => { alive = false; sb.removeChannel(ch) };
      }
    })
  };

  const user = {
    id: async () => { await ready; return session ? session.user.id : null },
    me: async () => {
      await ready; const m = (session && session.user.user_metadata) || {};
      return { id: session ? session.user.id : null, name: m.full_name || m.global_name || m.name || m.user_name || '' };
    }
  };

  window.claude = { use: async name => { await ready; return name === 'db' && session ? db : name === 'user' ? user : null } };
  window.coupeAuth = {
    providers: cfg.providers || ['discord', 'google'],
    signIn: provider => sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }),
    signOut: () => sb.auth.signOut().then(() => location.reload()),
    // Efface les documents et le compte (fonction supprimer_mon_compte de schema.sql). La progression locale reste sur l'appareil.
    deleteAccount: () => sb.rpc('supprimer_mon_compte').then(({ error }) => { if (error) throw error; return sb.auth.signOut() }).then(() => location.reload())
  };
})();
