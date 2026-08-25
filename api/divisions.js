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

    if (action === 'join_division') {
      if (!division_id || !['management', 'development', 'review'].includes(division_id)) {
         return res.status(400).json({ error: 'Invalid division_id' });
      }
      // Clear existing divisions to prevent multiple rows per user
      await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      // Insert the new division
      const postRes = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, division_id, whatsapp: whatsapp || null })
      });
      if (!postRes.ok) return res.status(400).json({ error: 'Failed to join division' });
      return res.status(200).json({ success: true });
    }

    if (action === 'get_divisions') {
      const divRes = await fetch(`${supabaseUrl}/rest/v1/divisions?select=*`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const rawDivs = divRes.ok ? await divRes.json() : [];
      const divs = Array.isArray(rawDivs) ? rawDivs : [];
      
      let allUsers = [];
      let userPage = 1;
      let hasMoreUsers = true;
      while (hasMoreUsers) {
        const sbUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${userPage}&per_page=1000`, {
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        if (!sbUsersRes.ok) break;
        try {
          const usersData = await sbUsersRes.json();
          const pageUsers = (usersData && Array.isArray(usersData.users)) ? usersData.users : [];
          allUsers = allUsers.concat(pageUsers);
          if (pageUsers.length < 1000) hasMoreUsers = false;
          else userPage++;
        } catch(e) { break; }
      }

      const memResDirect = await fetch(`${supabaseUrl}/rest/v1/division_members?select=division_id,user_id`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const rawMems = memResDirect.ok ? await memResDirect.json() : [];
      const mems = Array.isArray(rawMems) ? rawMems : [];
      
      const stats = divs.map(d => {
        const divisionMems = mems.filter(m => m.division_id === d.id);
        const membersList = divisionMems.map(m => {
           const u = allUsers.find(au => au.id === m.user_id);
           const email = u ? u.email : 'Unknown User';
           const username = u?.user_metadata?.username || (u ? u.email.split('@')[0] : 'Unknown');
           return { email, username };
        });
        return {
          ...d,
          member_count: divisionMems.length,
          members: membersList
        };
      });
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

    if (action === 'assign_member' || action === 'remove_member') {
      const { target_email } = req.body;
      if (!target_email) return res.status(400).json({ error: 'Missing target_email' });

      const ALLOWED_DIVISIONS = ['management', 'development', 'review'];
      if (action === 'assign_member' && (!division_id || !ALLOWED_DIVISIONS.includes(division_id))) {
        return res.status(400).json({ error: 'Invalid or missing division_id' });
      }
      
      let allUsers = [];
      let userPage = 1;
      let hasMoreUsers = true;
      while (hasMoreUsers) {
        const sbUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${userPage}&per_page=1000`, {
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        if (!sbUsersRes.ok) break;
        try {
          const usersData = await sbUsersRes.json();
          const pageUsers = (usersData && Array.isArray(usersData.users)) ? usersData.users : [];
          allUsers = allUsers.concat(pageUsers);
          if (pageUsers.length < 1000) hasMoreUsers = false;
          else userPage++;
        } catch(e) { break; }
      }

      const targetUser = allUsers.find(u => u.email === target_email);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      
      if (action === 'assign_member') {
        const { role } = req.body;
        const resRole = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
          method: 'POST',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: targetUser.id, division_id })
        });
        if (!resRole.ok) throw new Error(await resRole.text());

        if (role === 'admin') {
          await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
            method: 'POST',
            headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates' },
            body: JSON.stringify({ identifier: targetUser.email, role: 'admin' })
          });
        }
        return res.status(200).json({ success: true });
      }

      if (action === 'remove_member') {
        const resRole = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${targetUser.id}&division_id=eq.${division_id}`, {
          method: 'DELETE',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        if (!resRole.ok) throw new Error(await resRole.text());
        return res.status(200).json({ success: true });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
