export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) return res.status(500).json({ error: 'Server config error' });

  // Verify caller is admin
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${token}` }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const userData = await userRes.json();

  const encEmail = encodeURIComponent(userData.email);
  const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  let roleData = [];
  if (roleRes.ok) roleData = await roleRes.json();
  const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
  const hasAdminRole = roleData && roleData.length > 0 && roleData[0].role === 'admin';
  if (!isSuperAdmin && !hasAdminRole) return res.status(403).json({ error: 'Forbidden. Admin only.' });

  try {
    const { max_age_hours } = req.body;
    const maxAge = max_age_hours || 24; // Default: delete guests older than 24 hours
    const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString();

    // Fetch all users
    let allUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=100`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      if (!usersRes.ok) break;
      const usersData = await usersRes.json();
      const users = usersData.users || [];
      allUsers = allUsers.concat(users);
      if (users.length < 100) hasMore = false;
      page++;
    }

    // Find guest accounts (email matches guest_*@mrcapsules.com and is_guest metadata)
    const guestUsers = allUsers.filter(u => {
      const isGuestEmail = u.email && u.email.match(/^guest_\d+_\d+@mrcapsules\.com$/);
      const isGuestMeta = u.user_metadata && u.user_metadata.is_guest;
      const isOldEnough = new Date(u.created_at) < new Date(cutoff);
      return (isGuestEmail || isGuestMeta) && isOldEnough;
    });

    let deleted = 0;
    let errors = [];

    for (const guest of guestUsers) {
      // Clean up division_members first
      await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${guest.id}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      // Clean up user_stats
      await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${guest.id}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      // Clean up user_devices
      await fetch(`${supabaseUrl}/rest/v1/user_devices?user_id=eq.${guest.id}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      // Delete the auth user
      const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${guest.id}`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      if (delRes.ok) {
        deleted++;
      } else {
        const errText = await delRes.text();
        errors.push({ email: guest.email, error: errText });
      }
    }

    return res.status(200).json({
      success: true,
      total_guests_found: guestUsers.length,
      deleted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
