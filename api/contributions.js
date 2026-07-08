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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }
  const { action } = body;

  try {
    if (action === 'get_my_contributions') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?user_id=eq.${userId}&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await resData.json();
      return res.status(200).json({ success: true, contributions: Array.isArray(data) ? data : [] });
    }

    if (action === 'get_leaderboard') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?select=points,user_id`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await resData.json();
      const validData = Array.isArray(data) ? data : [];
      
      const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
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
         if (!scores[email]) scores[email] = 0;
         scores[email] += c.points;
      });
      
      const leaderboard = Object.keys(scores).map(k => ({ email: k, points: scores[k] }))
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
         headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ uid: userId })
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
