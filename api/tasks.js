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

  const { 
    action, task_id, title, description, semester, block, category, 
    target_path, priority, note, status, assigned_to_email 
  } = req.body;

  try {
    // 1. Get user's division and roles
    const memRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}&select=division_id`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
    });
    const memData = await memRes.json();
    const myDivision = memData.length > 0 ? memData[0].division_id : null;

    const encEmail = encodeURIComponent(userData.email);
    const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
    });
    let roleData = [];
    if (roleRes.ok) roleData = await roleRes.json();
    const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
    const hasAdminRole = roleData && roleData.length > 0 && roleData[0].role === 'admin';
    const isAdmin = isSuperAdmin || hasAdminRole;

    const isManagement = myDivision === 'management' || isAdmin;
    const isDeveloper = myDivision === 'development' || isAdmin;
    const isReviewer = myDivision === 'review' || isAdmin;

    // Helper: log task action
    const logAction = async (taskId, act, oldStatus, newStatus, n) => {
      await fetch(`${supabaseUrl}/rest/v1/task_logs`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, user_id: userId, action: act, old_status: oldStatus, new_status: newStatus, note: n })
      });
    };

    // Helper: record contribution
    const recordContribution = async (taskId, type) => {
      await fetch(`${supabaseUrl}/rest/v1/contributions`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, task_id: taskId, type: type, points: 1 })
      });
    };

    if (action === 'list_tasks') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?select=*&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const tasks = await getRes.json();
      
      // Fetch all users to resolve IDs to emails
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
      
      // Fetch division members to get whatsapp
      const membersRes = await fetch(`${supabaseUrl}/rest/v1/division_members?select=user_id,whatsapp`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const membersData = await membersRes.json();
      
      // Enrich tasks with user emails
      const enriched = tasks.map(t => {
        const createdBy = allUsers.find(u => u.id === t.created_by);
        const assignedTo = allUsers.find(u => u.id === t.assigned_to);
        const reviewedBy = allUsers.find(u => u.id === t.reviewed_by);
        
        let assignedWhatsapp = null;
        if (assignedTo && Array.isArray(membersData)) {
          const mem = membersData.find(m => m.user_id === t.assigned_to);
          if (mem && mem.whatsapp) assignedWhatsapp = mem.whatsapp;
        }

        return {
          ...t,
          created_by_user: createdBy ? { email: createdBy.email } : null,
          assigned_to_user: assignedTo ? { email: assignedTo.email, whatsapp: assignedWhatsapp } : null,
          reviewed_by_user: reviewedBy ? { email: reviewedBy.email } : null
        };
      });
      
      return res.status(200).json({ success: true, tasks: enriched });
    }

    if (action === 'create_task') {
      if (!isManagement) return res.status(403).json({ error: 'Management only' });
      
      let assignedToId = null;
      let finalStatus = 'open';
      let assignedAt = null;
      
      if (assigned_to_email) {
        // Resolve email to user_id
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
        const u = allUsers.find(x => x.email === assigned_to_email);
        if (u) {
          assignedToId = u.id;
          finalStatus = 'in_progress';
          assignedAt = new Date().toISOString();
        }
      }

      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          title, description, semester, block, category, target_path, priority,
          status: finalStatus, created_by: userId, assigned_to: assignedToId, assigned_at: assignedAt
        })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(data[0].id, 'created', null, finalStatus, note);
      if (assignedToId) {
         await logAction(data[0].id, 'assigned', 'open', 'in_progress', `Assigned to ${assigned_to_email} by management`);
      }
      await recordContribution(data[0].id, 'task_created');
      
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'claim_task') {
      if (!isDeveloper) return res.status(403).json({ error: 'Developers only' });
      
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ assigned_to: userId, status: 'in_progress', assigned_at: new Date().toISOString() })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'claimed', 'open', 'in_progress', note);
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'unclaim_task') {
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ assigned_to: null, status: 'open', assigned_at: null })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'unclaimed', 'in_progress', 'open', note);
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'submit_task') {
      if (!isDeveloper) return res.status(403).json({ error: 'Developers only' });
      
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'developed', submitted_at: new Date().toISOString() })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'submitted', 'in_progress', 'developed', note);
      await recordContribution(task_id, 'task_developed');
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'start_review') {
      if (!isReviewer) return res.status(403).json({ error: 'Reviewers only' });
      
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ reviewed_by: userId, status: 'in_review', review_started_at: new Date().toISOString() })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'review_started', 'developed', 'in_review', note);
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'approve_task') {
      if (!isReviewer) return res.status(403).json({ error: 'Reviewers only' });
      
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() })
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'approved', 'in_review', 'done', note);
      await recordContribution(task_id, 'task_approved');
      
      // Also reward the developer who completed it
      if (data[0].assigned_to) {
         await fetch(`${supabaseUrl}/rest/v1/contributions`, {
           method: 'POST',
           headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ user_id: data[0].assigned_to, task_id: task_id, type: 'task_completed', points: 3 })
         });
      }
      
      return res.status(200).json({ success: true, task: data[0] });
    }

    if (action === 'reject_task') {
      if (!isReviewer) return res.status(403).json({ error: 'Reviewers only' });
      
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'in_progress' }) // Send back to dev
      });
      if (!fetchRes.ok) throw new Error(await fetchRes.text());
      const data = await fetchRes.json();
      
      await logAction(task_id, 'rejected', 'in_review', 'in_progress', note);
      return res.status(200).json({ success: true, task: data[0] });
    }
    
    if (action === 'add_task_note') {
      await logAction(task_id, 'commented', null, null, note);
      return res.status(200).json({ success: true });
    }

    if (action === 'get_task_logs') {
      const fetchRes = await fetch(`${supabaseUrl}/rest/v1/task_logs?task_id=eq.${task_id}&select=*&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const logs = await fetchRes.json();
      
      // Resolve user IDs to emails
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
      
      const enrichedLogs = logs.map(l => {
        const u = allUsers.find(au => au.id === l.user_id);
        return { ...l, user: u ? { email: u.email } : null };
      });
      
      return res.status(200).json({ success: true, logs: enrichedLogs });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
