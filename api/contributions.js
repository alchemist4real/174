export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) return res.status(500).json({ error: 'Server config error' });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' },
    cache: 'no-store'
  });

  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const userData = await userRes.json();
  const userId = userData.id;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }
  const { action } = body;

  try {
    if (action === 'get_my_contributions') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?user_id=eq.${userId}&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      const data = await resData.json();
      if (!Array.isArray(data)) console.error('get_my_contributions error:', data);
      return res.status(200).json({ success: true, contributions: Array.isArray(data) ? data : [] });
    }

    if (action === 'get_leaderboard') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?select=points,user_id`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      const data = await resData.json();
      if (!Array.isArray(data)) console.error('get_leaderboard error:', data);
      const validData = Array.isArray(data) ? data : [];
      
      const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      let allUsers = [];
      if (usersRes.ok) {
         try {
             const usersData = await usersRes.json();
             allUsers = usersData.users || [];
         } catch(e) {}
      }
      
      const scores = {};
       validData.forEach(c => {
          const u = allUsers.find(au => au.id === c.user_id);
          const email = u ? u.email : 'Unknown';
          const username = u?.user_metadata?.username || (u ? u.email.split('@')[0] : 'Unknown');
          if (!scores[email]) scores[email] = { points: 0, username };
          scores[email].points += c.points;
       });
       
       const leaderboard = Object.keys(scores).map(k => ({ email: k, username: scores[k].username, points: scores[k].points }))
                                .sort((a,b) => b.points - a.points);
                               
      return res.status(200).json({ success: true, leaderboard });
    }

    if (action === 'check_contribution') {
       // Allow super admin to bypass
       const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
       if (isSuperAdmin) {
          return res.status(200).json({ success: true, has_contributed: true });
       }
       
       const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_user_contribution`, {
         method: 'POST',
         headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
         body: JSON.stringify({ uid: userId }),
         cache: 'no-store'
       });
       if (!rpcRes.ok) throw new Error(await rpcRes.text());
       const hasContributed = await rpcRes.json();
       
       return res.status(200).json({ success: true, has_contributed: hasContributed });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
