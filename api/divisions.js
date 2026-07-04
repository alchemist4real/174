export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) return res.status(500).json({ error: 'Server config error' });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${token}` }
  });

  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const userData = await userRes.json();
  const userId = userData.id;

  const { action, division_id, target_user_id, whatsapp } = req.body;

  try {
    if (action === 'get_my_division') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}&select=division_id,whatsapp`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await getRes.json();
      return res.status(200).json({ success: true, division: data.length > 0 ? data[0] : null });
    }

    if (action === 'get_divisions') {
      const divRes = await fetch(`${supabaseUrl}/rest/v1/divisions?select=*`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const divs = await divRes.json();
      
      const memRes = await fetch(`${supabaseUrl}/rest/v1/division_members?select=division_id`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const mems = await memRes.json();
      
      const stats = divs.map(d => ({
        ...d,
        member_count: mems.filter(m => m.division_id === d.id).length
      }));
      return res.status(200).json({ success: true, divisions: stats });
    }

    if (action === 'update_whatsapp') {
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp })
      });
      if (!updateRes.ok) throw new Error('Update failed');
      return res.status(200).json({ success: true });
    }

    // Role check for admin actions
    const encEmail = encodeURIComponent(userData.email);
    const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
    });
    let roleData = [];
    if (roleRes.ok) roleData = await roleRes.json();
    const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
    const hasAdminRole = roleData && roleData.length > 0 && roleData[0].role === 'admin';
    const isAdmin = isSuperAdmin || hasAdminRole;

    if (!isAdmin) return res.status(403).json({ error: 'Forbidden. Admin only.' });

    if (action === 'assign_member') {
      // Upsert
      const resRole = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: target_user_id, division_id })
      });
      if (!resRole.ok) throw new Error(await resRole.text());
      return res.status(200).json({ success: true });
    }

    if (action === 'remove_member') {
      const resRole = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${target_user_id}&division_id=eq.${division_id}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      if (!resRole.ok) throw new Error(await resRole.text());
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
