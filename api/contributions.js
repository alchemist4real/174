// Couple Contribution Package (Farid & Khesy)
const COUPLE_EMAILS = new Set([
  'farid.hmzh00@gmail.com',
  'khesyian@gmail.com'
]);

const COUPLE_USER_IDS = new Set([
  '20326419-e37a-4e46-a473-cb013a21acfe', // Farid (farid.hmzh00@gmail.com)
  'a197ddbd-7f7f-44ad-8c77-4fd868607241'  // Khesy (khesyian@gmail.com)
]);

function isCoupleMember(user) {
  if (!user) return false;
  if (user.id && COUPLE_USER_IDS.has(user.id)) return true;
  const email = (user.email || '').toLowerCase();
  if (COUPLE_EMAILS.has(email)) return true;
  const meta = user.user_metadata || {};
  const username = (meta.username || '').toLowerCase();
  const fullName = (meta.full_name || meta.name || '').toLowerCase();

  const isFarid = (email.includes('farid') || username.includes('farid') || fullName.includes('farid')) && !email.includes('muqorroben');
  const isKhesy = email.includes('khesy') || email.includes('keisya') || email.includes('kheisya') || username.includes('khesy') || username.includes('keisya') || fullName.includes('khesy') || fullName.includes('keisya');

  return isFarid || isKhesy;
}

async function fetchAllAdminUsers(supabaseUrl, sbKey) {
  let allUsers = [];
  let userPage = 1;
  let hasMoreUsers = true;
  while (hasMoreUsers) {
    const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${userPage}&per_page=1000`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
      cache: 'no-store'
    });
    if (!usersRes.ok) break;
    try {
      const usersData = await usersRes.json();
      const pageUsers = (usersData && Array.isArray(usersData.users)) ? usersData.users : [];
      allUsers = allUsers.concat(pageUsers);
      if (pageUsers.length < 1000) hasMoreUsers = false;
      else userPage++;
    } catch(e) { break; }
  }
  return allUsers;
}

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
      const isCouple = isCoupleMember(userData);
      let targetUserIds = [userId];

      if (isCouple) {
        const allUsers = await fetchAllAdminUsers(supabaseUrl, sbKey);
        const coupleUsers = allUsers.filter(isCoupleMember);
        if (coupleUsers.length > 0) {
          targetUserIds = Array.from(new Set(coupleUsers.map(u => u.id)));
        }
      }

      const filterParam = targetUserIds.length > 1
        ? `user_id=in.(${targetUserIds.join(',')})`
        : `user_id=eq.${userId}`;

      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?${filterParam}&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      const data = await resData.json();
      if (!Array.isArray(data)) console.error('get_my_contributions error:', data);
      return res.status(200).json({
        success: true,
        is_couple: isCouple,
        couple_package: isCouple ? 'Paket Contribution Couple: Farid & Khesy' : null,
        contributions: Array.isArray(data) ? data : []
      });
    }

    if (action === 'get_leaderboard') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?select=points,user_id`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      const data = await resData.json();
      if (!Array.isArray(data)) console.error('get_leaderboard error:', data);
      const validData = Array.isArray(data) ? data : [];
      
      const allUsers = await fetchAllAdminUsers(supabaseUrl, sbKey);
      
      // Calculate pooled points for couple package (Farid & Khesy)
      const coupleUserIds = new Set(allUsers.filter(isCoupleMember).map(u => u.id));
      let coupleTotalPoints = 0;
      validData.forEach(c => {
        if (coupleUserIds.has(c.user_id)) {
          coupleTotalPoints += (c.points || 0);
        }
      });
      
      const scores = {};
      validData.forEach(c => {
        const u = allUsers.find(au => au.id === c.user_id);
        const email = u ? u.email : 'Unknown';
        const username = u?.user_metadata?.username || (u ? u.email.split('@')[0] : 'Unknown');
        const userIsCouple = isCoupleMember(u);
        if (!scores[email]) {
          scores[email] = {
            points: 0,
            username,
            is_couple: userIsCouple
          };
        }
        if (!userIsCouple) {
          scores[email].points += (c.points || 0);
        }
      });

      // Ensure couple users have their points connected/synced to coupleTotalPoints
      allUsers.filter(isCoupleMember).forEach(cu => {
        const email = cu.email;
        const username = cu.user_metadata?.username || cu.email.split('@')[0];
        scores[email] = {
          points: coupleTotalPoints,
          username,
          is_couple: true
        };
      });
       
      const leaderboard = Object.keys(scores).map(k => ({
        email: k,
        username: scores[k].username,
        points: scores[k].points,
        is_couple: scores[k].is_couple || false
      })).sort((a,b) => b.points - a.points);
                               
      return res.status(200).json({ success: true, leaderboard });
    }

    if (action === 'check_contribution') {
      // Allow super admin to bypass
      const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
      if (isSuperAdmin) {
        return res.status(200).json({ success: true, has_contributed: true });
      }
      // Allow guest users to bypass
      const isGuest = (userData.email && userData.email.match(/^guest_\d+_\d+@mrcapsules\.com$/)) ||
                      (userData.user_metadata && userData.user_metadata.is_guest);
      if (isGuest) {
        return res.status(200).json({ success: true, has_contributed: true });
      }
      
      // Check couple package
      if (isCoupleMember(userData)) {
        const allUsers = await fetchAllAdminUsers(supabaseUrl, sbKey);
        const coupleUserIds = Array.from(new Set(allUsers.filter(isCoupleMember).map(u => u.id)));
        if (coupleUserIds.length > 0) {
          const filterParam = coupleUserIds.length > 1
            ? `user_id=in.(${coupleUserIds.join(',')})`
            : `user_id=eq.${userId}`;
          const resData = await fetch(`${supabaseUrl}/rest/v1/contributions?${filterParam}&select=created_at&order=created_at.desc&limit=1`, {
            headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Cache-Control': 'no-cache' },
            cache: 'no-store'
          });
          const data = await resData.json();
          if (Array.isArray(data) && data.length > 0) {
            const hasRecent = new Date(data[0].created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (hasRecent) {
              return res.status(200).json({ success: true, has_contributed: true, is_couple: true });
            }
          }
        }
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
