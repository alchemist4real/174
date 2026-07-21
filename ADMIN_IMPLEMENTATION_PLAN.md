# Admin Page Feature Expansion — Unified Comprehensive Implementation Plan

This document details the exhaustive, unified design system, database schemas, backend endpoints, and frontend client modifications required to implement all **24 features** (across Tiers 1, 2, 3, A, B, and C) for the **MR-CAPSULES Admin Page**.

---

## 1. System Architecture & Database Schema Migrations

To support notification management, user invitation links, task due dates, and division request logs, execute the following SQL migration script in the Supabase SQL Editor. This script creates the required database tables, configures Indexes for high performance, and enforces Row-Level Security (RLS) policies.

```sql
-- ==========================================
-- 1. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'task_assigned' | 'task_submitted' | 'task_rejected' | 'task_approved' | 'announcement'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  task_id UUID REFERENCES public.content_tasks(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- RLS Configuration
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 2. DIVISION JOIN REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.division_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id TEXT NOT NULL,
  whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Ensure a user can only have one active pending request at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_division_requests_pending ON public.division_requests(user_id) WHERE status = 'pending';

-- RLS Configuration
ALTER TABLE public.division_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and create their own division requests" ON public.division_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins/Management can view all division requests" ON public.division_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.division_members 
      WHERE division_members.user_id = auth.uid() 
      AND (division_members.division_id = 'management' OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.identifier = auth.jwt()->>'email' AND user_roles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins/Management can review division requests" ON public.division_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.division_members 
      WHERE division_members.user_id = auth.uid() 
      AND (division_members.division_id = 'management' OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.identifier = auth.jwt()->>'email' AND user_roles.role = 'admin'
      ))
    )
  );

-- ==========================================
-- 3. INVITE TOKENS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false,
  note TEXT
);

-- RLS Configuration
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can select active invite tokens" ON public.invite_tokens
  FOR SELECT USING (is_used = false AND expires_at > now());

CREATE POLICY "Admins can view and manage all invite tokens" ON public.invite_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.identifier = auth.jwt()->>'email' 
      AND user_roles.role = 'admin'
    )
  );

-- ==========================================
-- 4. CONTENT_TASKS TABLE SCHEMA EXPANSION
-- ==========================================
ALTER TABLE public.content_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
```

---

## 2. Backend Serverless API Implementation

### 2a. Notifications Endpoint — `api/notifications.js` [NEW File]

This endpoint processes notification lists, marking specific notifications as read, and bulk marking all user notifications as read.

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Verify authorization against Supabase
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${token}` }
  });

  if (!userRes.ok) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userData = await userRes.json();
  const userId = userData.id;

  const { action, id } = req.body;

  try {
    // === GET USER NOTIFICATIONS ===
    if (action === 'get_notifications') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}&select=*&order=created_at.desc&limit=50`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      if (!getRes.ok) throw new Error(await getRes.text());
      const notifications = await getRes.json();
      return res.status(200).json({ success: true, notifications });
    }

    // === MARK SINGLE NOTIFICATION AS READ ===
    if (action === 'mark_read') {
      if (!id) return res.status(400).json({ error: 'Missing notification ID' });
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${id}&user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());
      return res.status(200).json({ success: true });
    }

    // === MARK ALL USER NOTIFICATIONS AS READ ===
    if (action === 'mark_all_read') {
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### 2b. Invitation Links Endpoint — `api/invites.js` [NEW File]

This endpoint generates, revokes, lists, validates, and consumes sign-up invitation tokens. Bypasses authentication check for validation/consumption during guest signups.

```javascript
export default async function handler(req, res) {
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Public/Unauthenticated Sign-up Checks
  if (req.method === 'POST' && req.body && (req.body.action === 'validate_invite' || req.body.action === 'consume_invite')) {
    const { action, token, new_user_id } = req.body;
    try {
      if (action === 'validate_invite') {
        if (!token) return res.status(400).json({ error: 'Missing token' });
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/invite_tokens?token=eq.${token}&is_used=eq.false&expires_at=gt.now()&select=*`, {
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        const data = await checkRes.json();
        if (data.length === 0) return res.status(200).json({ valid: false });
        return res.status(200).json({ valid: true, invite: data[0] });
      }
      if (action === 'consume_invite') {
        if (!token || !new_user_id) return res.status(400).json({ error: 'Missing parameters' });
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/invite_tokens?token=eq.${token}`, {
          method: 'PATCH',
          headers: {
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ is_used: true, used_by: new_user_id, used_at: new Date().toISOString() })
        });
        if (!patchRes.ok) throw new Error(await patchRes.text());
        return res.status(200).json({ success: true });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Authenticated Actions
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const authToken = authHeader.replace('Bearer ', '');

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${authToken}` }
  });
  if (!userRes.ok) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userData = await userRes.json();
  const userId = userData.id;

  const { action, note, token_id } = req.body;

  try {
    // Role check for administrative commands
    const encEmail = encodeURIComponent(userData.email);
    const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
    });
    let roleData = [];
    if (roleRes.ok) roleData = await roleRes.json();
    const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
    const hasAdminRole = roleData && roleData.length > 0 && roleData[0].role === 'admin';
    const isAdmin = isSuperAdmin || hasAdminRole;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin credentials required.' });
    }

    if (action === 'create_invite') {
      const createRes = await fetch(`${supabaseUrl}/rest/v1/invite_tokens`, {
        method: 'POST',
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ created_by: userId, note: note || null })
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const data = await createRes.json();
      return res.status(200).json({ success: true, invite: data[0] });
    }

    if (action === 'list_invites') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/invite_tokens?is_used=eq.false&expires_at=gt.now()&select=*`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const invites = await getRes.json();
      return res.status(200).json({ success: true, invites });
    }

    if (action === 'revoke_invite') {
      if (!token_id) return res.status(400).json({ error: 'Missing token ID' });
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/invite_tokens?id=eq.${token_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_used: true, note: 'Revoked by administrator' })
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### 2c. Task Management Modifications — `api/tasks.js`

Add the `edit_task`, `delete_task`, and `reassign_task` action blocks to [api/tasks.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/api/tasks.js). Additionally, insert notification triggers to push real-time alerts into the `notifications` table on status changes.

#### Insert notification sender helper:
```javascript
// Add inside handler body:
const sendNotification = async (targetUserId, type, title, body, taskId) => {
  await fetch(`${supabaseUrl}/rest/v1/notifications`, {
    method: 'POST',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: targetUserId,
      type: type,
      title: title,
      body: body,
      task_id: taskId,
      is_read: false
    })
  });
};
```

#### Append new actions in action conditional block:
```javascript
// === EDIT TASK ===
if (action === 'edit_task') {
  if (!isManagement) return res.status(403).json({ error: 'Management only' });
  const updateFields = {};
  if (title !== undefined)       updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (category !== undefined)    updateFields.category = category;
  if (priority !== undefined)    updateFields.priority = priority;
  if (req.body.semester !== undefined)  updateFields.semester = parseInt(req.body.semester, 10);
  if (req.body.block !== undefined)     updateFields.block = req.body.block;
  if (req.body.target_path !== undefined) updateFields.target_path = req.body.target_path;
  if (req.body.due_date !== undefined)  updateFields.due_date = req.body.due_date;

  if (assigned_to_email !== undefined) {
    if (assigned_to_email === null) {
      updateFields.assigned_to = null;
      updateFields.assigned_at = null;
    } else {
      const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      let allUsers = [];
      if (usersRes.ok) {
        try { allUsers = (await usersRes.json()).users || []; } catch(e) {}
      }
      const targetUser = allUsers.find(u => u.email === assigned_to_email);
      if (!targetUser) return res.status(400).json({ error: 'Assignee not found' });
      updateFields.assigned_to = targetUser.id;
      updateFields.assigned_at = new Date().toISOString();
    }
  }

  const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
    method: 'PATCH',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(updateFields)
  });
  if (!fetchRes.ok) throw new Error(await fetchRes.text());
  const data = await fetchRes.json();
  await logAction(task_id, 'edited', null, null, `Fields updated: ${Object.keys(updateFields).join(', ')}`);
  
  // Notify if new assignee has been configured
  if (updateFields.assigned_to) {
    await sendNotification(updateFields.assigned_to, 'task_assigned', 'Task Assigned', `You have been assigned: ${title || data[0].title}`, task_id);
  }
  return res.status(200).json({ success: true, task: data[0] });
}

// === DELETE TASK ===
if (action === 'delete_task') {
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
  // Cascade cleanups
  await fetch(`${supabaseUrl}/rest/v1/task_logs?task_id=eq.${task_id}`, {
    method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  await fetch(`${supabaseUrl}/rest/v1/contributions?task_id=eq.${task_id}`, {
    method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  const delRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
    method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  if (!delRes.ok) throw new Error(await delRes.text());
  return res.status(200).json({ success: true });
}

// === RE-ASSIGN TASK ===
if (action === 'reassign_task') {
  if (!isManagement) return res.status(403).json({ error: 'Management only' });
  const { new_assignee_email } = req.body;
  let newAssigneeId = null;

  if (new_assignee_email) {
    const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
    });
    let allUsers = [];
    if (usersRes.ok) {
      try { allUsers = (await usersRes.json()).users || []; } catch(e) {}
    }
    const u = allUsers.find(x => x.email === new_assignee_email);
    if (u) newAssigneeId = u.id;
    else return res.status(400).json({ error: 'New assignee not found' });
  }

  const updateBody = {
    assigned_to: newAssigneeId,
    status: newAssigneeId ? 'in_progress' : 'open',
    assigned_at: newAssigneeId ? new Date().toISOString() : null
  };

  const fetchRes = await fetch(`${supabaseUrl}/rest/v1/content_tasks?id=eq.${task_id}`, {
    method: 'PATCH',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(updateBody)
  });
  if (!fetchRes.ok) throw new Error(await fetchRes.text());
  const data = await fetchRes.json();

  await logAction(task_id, 'reassigned', null, updateBody.status,
    newAssigneeId ? `Re-assigned to ${new_assignee_email}` : 'Unassigned by management');
  
  if (newAssigneeId) {
    await sendNotification(newAssigneeId, 'task_assigned', 'Task Assigned', `Management re-assigned task to you: ${data[0].title}`, task_id);
  }
  return res.status(200).json({ success: true, task: data[0] });
}
```

#### Add notification hooks inside existing status updates:
- **`create_task`**: (when assigned_to is present)
  ```javascript
  if (postRes.ok && req.body.assigned_to) {
    await sendNotification(req.body.assigned_to, 'task_assigned', 'New Task Assigned', `You have been assigned: ${title}`, task.id);
  }
  ```
- **`submit_task`**: (alerts all members of division `review`)
  ```javascript
  const revRes = await fetch(`${supabaseUrl}/rest/v1/division_members?division_id=eq.review&select=user_id`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  if (revRes.ok) {
    const reviewers = await revRes.json();
    for (const r of reviewers) {
      await sendNotification(r.user_id, 'task_submitted', 'Task Submitted for Review', `Developer submitted task: ${task.title}`, task_id);
    }
  }
  ```
- **`approve_task`**: (alerts developer assignee)
  ```javascript
  if (task.assigned_to) {
    await sendNotification(task.assigned_to, 'task_approved', 'Task Approved 🎉', `Your task has been approved: ${task.title}`, task_id);
  }
  ```
- **`reject_task`**: (alerts developer assignee)
  ```javascript
  if (task.assigned_to) {
    await sendNotification(task.assigned_to, 'task_rejected', 'Task Rejected ❌', `Your task was sent back: ${task.title}. Note: ${note}`, task_id);
  }
  ```

### 2d. Division Request Modifications — `api/divisions.js`

Modify the behavior of [api/divisions.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/api/divisions.js) so that requests are queued in the `division_requests` approval table.

#### Modify `join_division` handler block:
```javascript
    if (action === 'join_division') {
      if (!division_id || !['management', 'development', 'review'].includes(division_id)) {
         return res.status(400).json({ error: 'Invalid division_id' });
      }
      
      // Delete any prior active request
      await fetch(`${supabaseUrl}/rest/v1/division_requests?user_id=eq.${userId}&status=eq.pending`, {
        method: 'DELETE',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });

      // Insert pending join request
      const postRes = await fetch(`${supabaseUrl}/rest/v1/division_requests`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, division_id, whatsapp: whatsapp || null, status: 'pending' })
      });
      if (!postRes.ok) return res.status(400).json({ error: 'Failed to request division entry' });
      return res.status(200).json({ success: true });
    }
```

#### Append `get_my_request_status` action before the admin check (~line 101):
```javascript
    if (action === 'get_my_request_status') {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/division_requests?user_id=eq.${userId}&order=requested_at.desc&limit=1`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await checkRes.json();
      return res.status(200).json({ success: true, request: data.length > 0 ? data[0] : null });
    }
```

#### Append administrative actions after the admin check:
```javascript
    // === GET PENDING REQUESTS ===
    if (action === 'get_pending_requests') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/division_requests?status=eq.pending&select=*,user_id(id,email,user_metadata)`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await getRes.json();
      
      // Map to structured payload
      const requests = data.map(r => ({
        id: r.id,
        user_id: r.user_id?.id,
        email: r.user_id?.email,
        username: r.user_id?.user_metadata?.username || r.user_id?.email.split('@')[0],
        division_id: r.division_id,
        whatsapp: r.whatsapp,
        requested_at: r.requested_at
      }));
      return res.status(200).json({ success: true, requests });
    }

    // === REVIEW JOIN REQUEST ===
    if (action === 'review_request') {
      const { request_id, approved } = req.body;
      if (!request_id) return res.status(400).json({ error: 'Missing request_id' });

      // Get request metadata
      const reqRes = await fetch(`${supabaseUrl}/rest/v1/division_requests?id=eq.${request_id}`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const reqData = await reqRes.json();
      if (reqData.length === 0) return res.status(404).json({ error: 'Request not found' });
      const request = reqData[0];

      const newStatus = approved ? 'approved' : 'rejected';
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/division_requests?id=eq.${request_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());

      if (approved) {
        // Clear old division member entries
        await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${request.user_id}`, {
          method: 'DELETE',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        // Create division member row
        const memberRes = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
          method: 'POST',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: request.user_id, division_id: request.division_id, whatsapp: request.whatsapp })
        });
        if (!memberRes.ok) throw new Error(await memberRes.text());
        
        // Auto-assign metadata tag
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${request.user_id}`, {
          method: 'PUT',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_metadata: { division_selected: true } })
        });
      }
      
      // Push system alert notification
      await sendNotification(
        request.user_id,
        approved ? 'task_approved' : 'task_rejected',
        approved ? 'Division Entry Approved' : 'Division Entry Rejected',
        approved ? `Your request to join ${request.division_id} has been approved.` : `Your request to join ${request.division_id} was declined.`,
        null
      );

      return res.status(200).json({ success: true });
    }
```

### 2e. Admin System Actions & Rate Limits — `api/admin.js`

Add the `get_file_history`, `get_file_at_commit`, and `get_rate_limit` actions to [api/admin.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/api/admin.js). Also, adjust path checks to allow writes directly to `data.js`.

#### Modify Path Check Security Guard (Allow `data.js` override):
```javascript
  if (path) {
    if (path.includes('..') || path.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid path traversal detected.' });
    }
    // Allow data.js file to support program-driven metadata reconstruction
    if (path !== 'data.js' && !path.startsWith('content/') && !path.startsWith('cover/')) {
      return res.status(400).json({ error: 'Invalid path. Must be in content/ or cover/ directory.' });
    }
  }
```

#### Append new version control and API rate actions:
```javascript
    // === GET FILE HISTORY (GitHub Commits API) ===
    if (action === 'get_file_history') {
      const { path } = req.body;
      if (!path) return res.status(400).json({ error: 'Missing path parameter' });
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=20`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!ghRes.ok) throw new Error(`GitHub API Error: ${await ghRes.text()}`);
      const commits = await ghRes.json();
      
      const parsedCommits = commits.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date
      }));
      return res.status(200).json({ success: true, commits: parsedCommits });
    }

    // === GET FILE AT SPECIFIC COMMIT ===
    if (action === 'get_file_at_commit') {
      const { path, sha } = req.body;
      if (!path || !sha) return res.status(400).json({ error: 'Missing path or sha parameter' });
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${sha}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!fileRes.ok) return res.status(404).json({ error: 'File state not found at requested commit' });
      const fileData = await fileRes.json();
      return res.status(200).json({ success: true, content: fileData.content, sha: fileData.sha });
    }

    // === GET GITHUB API RATE LIMIT ===
    if (action === 'get_rate_limit') {
      const limitRes = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!limitRes.ok) throw new Error('Failed to query rate limits');
      const data = await limitRes.json();
      return res.status(200).json({ success: true, core: data.rate });
    }
```

---

## 3. Frontend Client Implementation

### 3a. Document Markup Changes — `admin.html`

Modify [admin.html](file:///d:/DOWNLOAD/MR-CAPSULES-main/admin.html) to incorporate the notification system interfaces, Chart.js libraries, CSV task template downloads, file version modals, calendar templates, and the user settings panel.

#### Insert Chart.js library block in `<head>`:
```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

#### Append notification bell and unread badge in `#adminTabs` (Dock area):
```html
      <!-- Notification Icon Tab -->
      <div class="tab notif-bell-tab" id="notifBellTab" onclick="toggleNotifPanel(event)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="notif-badge hidden" id="notifBadge">0</span>
        Notifs
      </div>
```

#### Insert notifications container list dropdown outside bottom dock:
```html
  <!-- Real-time Notification Panel Overlay -->
  <div id="notifPanel" class="notif-panel hidden">
    <div class="notif-panel-header">
      <span>Notifications</span>
      <button onclick="markAllNotifsRead()" class="btn-text">Mark All Read</button>
    </div>
    <div id="notifList" class="notif-list">
      <div style="padding:16px; text-align:center; color:var(--text-muted);">No new notifications</div>
    </div>
  </div>
```

#### Insert Dashboard charts container grid and progress bars inside `#viewDashboard`:
```html
        <!-- Charts Grid Section -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-card-title">Task Status Distribution</div>
            <div class="chart-canvas-wrapper"><canvas id="chartTaskStatus"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Contribution Trend (30 Days)</div>
            <div class="chart-canvas-wrapper"><canvas id="chartContribTrend"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Tasks by Category</div>
            <div class="chart-canvas-wrapper"><canvas id="chartTaskCategory"></canvas></div>
          </div>
        </div>

        <!-- Semester Content Progress -->
        <div class="semester-progress-section">
          <div class="card-column-header">Semester Content Coverage</div>
          <div id="semesterProgressList" class="semester-progress-list">
            <div class="placeholder-text">Checking coverage matrix...</div>
          </div>
        </div>
```

#### Add CSV import button next to task board controls inside `#viewTasks`:
```html
            <button id="btnImportCSV" class="btn-unified">Import CSV</button>
            <input type="file" id="csvFileInput" accept=".csv" class="hidden">
```

#### Add view toggle calendars options inside `#tasksViewToggle`:
```html
            <option value="calendar">Calendar View</option>
```

#### Append calendar layout container and grid inside `#viewTasks` (beneath table container):
```html
        <div id="calendarContainer" class="hidden calendar-container">
          <div class="calendar-nav">
            <button class="btn-unified" id="calPrev">&lsaquo;</button>
            <span id="calMonthLabel" class="calendar-month-label"></span>
            <button class="btn-unified" id="calNext">&rsaquo;</button>
          </div>
          <div class="calendar-grid" id="calendarGrid"></div>
        </div>
```

#### Append rebuilding button and orphan checks inside files browser toolbar in `#viewFiles`:
```html
          <button id="btnOrphanCheck" class="btn-unified" title="Check Orphaned Files">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="11"></line><line x1="11" y1="14" x2="11.01" y2="14"></line>
            </svg>
            Orphans Check
          </button>
          <button id="btnRebuildDataJs" class="btn-unified" title="Rebuild data.js">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Rebuild data.js
          </button>
```

#### Insert orphan file list container panel in `#viewFiles`:
```html
        <div id="orphanPanel" class="hidden orphan-panel">
          <div class="orphan-panel-header">
            <span class="orphan-panel-title">Orphan Detection Results</span>
            <button class="btn-text" onclick="document.getElementById('orphanPanel').classList.add('hidden')">&times;</button>
          </div>
          <div id="orphanContent" class="orphan-content"></div>
        </div>
```

#### Append pending requests dashboard inside `#viewUsers`:
```html
        <div id="pendingRequestsSection" class="hidden">
          <div class="card-column-header" style="cursor:pointer" onclick="togglePendingSection()">
            Pending Division Join Requests <span id="pendingRequestsBadge" class="badge badge-banned">0</span>
          </div>
          <div id="pendingRequestsList" class="pending-requests-wrapper"></div>
        </div>
```

#### Append settings panels inside bottom dock tabs `#adminTabs`:
```html
      <div class="tab" data-target="viewProfile">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        Profile
      </div>
```

#### Insert settings container panel `#viewProfile` inside `.main-panel` view:
```html
    <div id="viewProfile" class="view-section">
      <div class="toolbar"><h2 class="toolbar-header">My Profile & Settings</h2></div>
      <div class="profile-container">
        
        <!-- Identity Settings -->
        <div class="profile-card">
          <div class="profile-card-title">Identity Profile</div>
          <div class="settings-body-flex">
            <div>
              <label class="form-label">Display Name</label>
              <input type="text" id="profileUsername" class="auth-input settings-input-full" placeholder="Set public display name">
            </div>
            <div>
              <label class="form-label">Email (Read-Only)</label>
              <input type="text" id="profileEmail" class="auth-input settings-input-full" disabled>
            </div>
            <div>
              <label class="form-label">Active Division</label>
              <input type="text" id="profileDivision" class="auth-input settings-input-full" disabled>
            </div>
            <div>
              <label class="form-label">WhatsApp Contact Number</label>
              <input type="text" id="profileWhatsapp" class="auth-input settings-input-full" placeholder="e.g. 628123456789">
            </div>
            <div class="modal-actions modal-actions-end">
              <button id="btnSaveProfile" class="btn-unified primary">Save Details</button>
            </div>
          </div>
        </div>

        <!-- Security / Password updates -->
        <div class="profile-card">
          <div class="profile-card-title">Update Credentials</div>
          <div class="settings-body-flex">
            <div>
              <label class="form-label">New Password</label>
              <input type="password" id="profileNewPassword" class="auth-input settings-input-full" placeholder="Min 6 characters">
            </div>
            <div>
              <label class="form-label">Confirm Password</label>
              <input type="password" id="profileConfirmPassword" class="auth-input settings-input-full" placeholder="Repeat new password">
            </div>
            <div class="modal-actions modal-actions-end">
              <button id="btnChangePassword" class="btn-unified primary">Change Password</button>
            </div>
          </div>
        </div>

        <!-- Heatmaps stats -->
        <div class="profile-card profile-card-wide">
          <div class="profile-card-title">Developer Activity Heatmap</div>
          <div id="profileHeatmap" class="heatmap-container">
            <div class="placeholder-text">Synthesizing calendar grids...</div>
          </div>
          <div class="heatmap-legend">
            <span style="color:var(--text-muted); font-size:11px;">Less</span>
            <span class="heatmap-cell" style="background:var(--border-light);"></span>
            <span class="heatmap-cell" style="background:rgba(var(--accent-rgb, 211, 47, 47), 0.25);"></span>
            <span class="heatmap-cell" style="background:rgba(var(--accent-rgb, 211, 47, 47), 0.5);"></span>
            <span class="heatmap-cell" style="background:rgba(var(--accent-rgb, 211, 47, 47), 0.75);"></span>
            <span class="heatmap-cell" style="background:var(--accent);"></span>
            <span style="color:var(--text-muted); font-size:11px;">More</span>
          </div>
        </div>
      </div>
    </div>
```

#### Append new file modals overlays for histories and batch uploads at bottom of file:
```html
  <!-- File Version History Modal -->
  <div id="historyModal" class="settings-overlay">
    <div class="settings-box history-modal-box">
      <div class="settings-header">
        <span id="historyTitle" class="modal-title">FILE REVISION HISTORY</span>
        <button class="btn-text" id="historyClose" onclick="document.getElementById('historyModal').classList.remove('active')">&times; CLOSE</button>
      </div>
      <div class="settings-body" id="historyBody"></div>
    </div>
  </div>

  <!-- CSV Import Wizard Modal -->
  <div id="importCsvModal" class="settings-overlay">
    <div class="settings-box import-csv-modal">
      <div class="settings-header">
        <span class="modal-title">IMPORT WORK TASKS (CSV)</span>
        <button class="btn-text" id="importCsvClose" onclick="document.getElementById('importCsvModal').classList.remove('active')">&times; CLOSE</button>
      </div>
      <div class="settings-body">
        <div id="importCsvStep1">
          <p class="import-desc-text">CSV Headers: <code>title*, category*, priority, semester*, block*, description, target_path, assignee_email</code></p>
          <a id="btnDownloadTemplate" href="#" class="btn-unified">Download CSV Template</a>
          <div id="importDropArea" class="import-drop-area">
            <p>Drag and drop CSV files here or click to browse</p>
            <button class="btn-unified primary" id="importCsvBrowse">Select Local File</button>
          </div>
        </div>
        <div id="importCsvStep2" class="hidden">
          <div id="importPreviewInfo"></div>
          <div class="import-preview-table-wrapper">
            <table id="importPreviewTable" class="syllabus-table">
              <thead>
                <tr>
                  <th class="syllabus-table-th">Title</th>
                  <th class="syllabus-table-th">Cat</th>
                  <th class="syllabus-table-th">Prio</th>
                  <th class="syllabus-table-th">Sem</th>
                  <th class="syllabus-table-th">Block</th>
                  <th class="syllabus-table-th">Errors</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <div id="importProgressWrapper" class="hidden">
            <div id="importProgressBar" class="import-progress-bar"></div>
            <div id="importProgressText">Starting batch upload operations...</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button id="importCsvBack" class="btn-unified hidden">Back</button>
        <button id="importCsvConfirm" class="btn-unified primary hidden">Import Tasks</button>
      </div>
    </div>
  </div>
```

---

### 3b. Design Aesthetics & Colors Variables — `tokens.css`

Ensure color variables are exposed in RGB decimal strings so they can be referenced inside dynamic transparent color computations (`rgba(var(--accent-rgb), opacity)`).

#### Add inside `tokens.css` root scopes (~line 13):
```css
:root {
  --accent-rgb: 211, 47, 47;
}
[data-theme="dark"] {
  --accent-rgb: 226, 255, 74;
}
[data-theme="mrs"] {
  --accent-rgb: 42, 163, 201;
}
```

---

### 3c. Component Styles — `admin-styles.css`

Append the following styling blocks to [admin-styles.css](file:///d:/DOWNLOAD/MR-CAPSULES-main/admin-styles.css) to support grids, charts, notifications panels, custom drag-and-drop boxes, and activity heatmap cards.

```css
/* ===================================================================
   NOTIFICATION SYSTEM MODULE
   =================================================================== */
.notif-bell-tab { position: relative; }
.notif-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  min-width: 14px;
  text-align: center;
}
.notif-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 16px;
  width: 360px;
  max-height: 480px;
  background: var(--bg-card);
  border: var(--border-main);
  border-radius: var(--radius-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  z-index: 2000;
}
.notif-panel-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 12px;
}
.notif-list { overflow-y: auto; flex: 1; }
.notif-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
}
.notif-item:hover { background: var(--surface-hover); }
.notif-item.unread { border-left: 4px solid var(--accent); background: var(--accent-soft); }
.notif-item-title { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
.notif-item-body { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.notif-item-time { font-size: 10px; color: var(--text-muted); margin-top: 6px; text-align: right; }

/* ===================================================================
   CHARTS & PROGRESS BARS MODULE
   =================================================================== */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.chart-card {
  background: var(--bg-card);
  border: var(--border-main);
  border-radius: var(--radius-card);
  padding: 16px;
}
.chart-card-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.chart-canvas-wrapper { position: relative; height: 220px; width: 100%; }

/* Semester Coverage Tracking */
.semester-progress-section {
  margin-bottom: 24px;
  background: var(--bg-card);
  border: var(--border-main);
  border-radius: var(--radius-card);
  overflow: hidden;
}
.semester-progress-list { padding: 8px 16px 16px; }
.sem-progress-item { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.sem-progress-item:last-child { border-bottom: none; }
.sem-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sem-progress-label { font-size: 13px; font-weight: 700; }
.sem-progress-stats { font-size: 11px; }
.sem-progress-bar-track { height: 8px; background: var(--bg-main); border-radius: var(--radius-pill); position: relative; overflow: overflow; }
.sem-progress-bar-tracked { position: absolute; top: 0; left: 0; height: 100%; background: var(--border-medium); border-radius: var(--radius-pill); transition: width 0.3s; }
.sem-progress-bar-done { position: absolute; top: 0; left: 0; height: 100%; border-radius: var(--radius-pill); transition: width 0.3s; }
.sem-progress-pct { font-size: 11px; font-weight: 700; text-align: right; margin-top: 4px; }

/* ===================================================================
   FILE HISTORY & VERSION CONTROL MODULE
   =================================================================== */
.history-modal-box { max-width: 600px; width: 90vw; max-height: 80vh; display: flex; flex-direction: column; }
.history-commit-item { padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; flex-direction: column; }
.history-commit-item:last-child { border-bottom: none; }
.history-commit-msg { font-size: 13px; font-weight: 700; margin-bottom: 4px; line-height: 1.4; }
.history-commit-meta { font-size: 11px; color: var(--text-muted); margin-bottom: 10px; }
.history-commit-actions { display: flex; gap: 8px; }

/* ===================================================================
   CSV IMPORT MODULE
   =================================================================== */
.import-csv-modal { max-width: 650px; width: 90vw; max-height: 85vh; }
.import-desc-text { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.import-drop-area {
  border: 2px dashed var(--border-medium);
  border-radius: var(--radius-card);
  padding: 32px 16px;
  text-align: center;
  background: var(--bg-main);
  margin-top: 16px;
  transition: border 0.2s, background 0.2s;
  cursor: pointer;
}
.import-drop-area.highlight { border-color: var(--accent); background: var(--surface-hover); }
.import-preview-table-wrapper { max-height: 250px; overflow-y: auto; border: var(--border-main); border-radius: var(--radius-card); margin: 16px 0; }
.import-progress-bar { height: 6px; background: var(--accent); width: 0%; border-radius: var(--radius-pill); transition: width 0.1s; margin-bottom: 8px; }

/* ===================================================================
   ORPHANED FILES MODULE
   =================================================================== */
.orphan-panel { margin: 12px 0; background: var(--bg-card); border: var(--border-main); border-radius: var(--radius-card); overflow: hidden; }
.orphan-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-light); }
.orphan-panel-title { font-size: 13px; font-weight: 700; text-transform: uppercase; }
.orphan-content { padding: 8px 0; max-height: 320px; overflow-y: auto; }
.orphan-section-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); background: var(--bg-main); }
.orphan-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border-light); font-size: 12px; }
.orphan-item:last-child { border-bottom: none; }
.orphan-path { font-family: var(--font-mono); color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.orphan-broken .orphan-path { color: var(--danger); }

/* ===================================================================
   USER SETTINGS & CALENDAR HEATMAPS
   =================================================================== */
.profile-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; padding: 16px; }
.profile-card { background: var(--bg-card); border: var(--border-main); border-radius: var(--radius-card); padding: 20px; display: flex; flex-direction: column; }
.profile-card-wide { grid-column: 1 / -1; }
.profile-card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }

/* flex layout settings inputs */
.settings-body-flex { display: flex; flex-direction: column; gap: 14px; }
.settings-input-full { width: 100%; box-sizing: border-box; }

/* Activity Heatmap */
.heatmap-container { overflow-x: auto; padding-bottom: 6px; margin-top: 12px; }
.heatmap-grid { display: flex; gap: 2px; }
.heatmap-col { display: flex; flex-direction: column; gap: 2px; }
.heatmap-cell { width: 11px; height: 11px; border-radius: 2px; flex-shrink: 0; cursor: default; transition: opacity 0.1s; }
.heatmap-cell:hover { opacity: 0.7; }
.heatmap-legend { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
.heatmap-legend .heatmap-cell { width: 11px; height: 11px; border-radius: 2px; }

/* Calendar Dashboard Layout */
.calendar-container { padding: 16px; background: var(--bg-card); border: var(--border-main); border-radius: var(--radius-card); }
.calendar-nav { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.calendar-month-label { font-size: 16px; font-weight: 700; flex: 1; text-align: center; text-transform: uppercase; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-day-header { padding: 6px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.cal-day { min-height: 72px; padding: 6px; border: 1px solid var(--border-light); border-radius: var(--radius-card); position: relative; display: flex; flex-direction: column; justify-content: space-between; transition: background 0.15s; }
.cal-day:not(.empty):hover { background: var(--surface-hover); cursor: pointer; }
.cal-day.empty { border-color: transparent; }
.cal-day-today { border-color: var(--accent) !important; }
.cal-day-num { font-size: 12px; font-weight: 700; }
.cal-dots { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 4px; }
.cal-dot { width: 6px; height: 6px; border-radius: var(--radius-pill); }
.cal-more { font-size: 9px; color: var(--text-muted); font-weight: bold; }
.cal-popup-task { padding: 10px; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.15s; }
.cal-popup-task:hover { background: var(--surface-hover); }
.cal-popup-task:last-child { border-bottom: none; }
.cal-popup-task-title { font-size: 13px; font-weight: 700; }
.cal-popup-task-meta { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

/* Division approvals details */
.pending-requests-wrapper { padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; }
.pending-request-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-main); border: var(--border-main); border-radius: var(--radius-card); }
.pending-request-meta { font-size: 12px; line-height: 1.4; }
.pending-request-actions { display: flex; gap: 8px; }
```

---

## 4. Frontend Application Logic

### 4a. Core Core Infrastructure Modifications — `admin.js`

Incorporate code version histories, rate limits, dashboard charts (Status Donut, Contribution Line, and Category Bar), and settings panels inside [admin.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/admin.js).

#### State Declarations (~line 25):
```javascript
// State declarations matching existing window scope hooks
let chartInstances = {};
window.notifications = [];
```

#### Realtime Notifications Subscription Setup:
Configure this listener to automatically trigger after `verifyAdmin` finishes during initialization.

```javascript
function initRealtimeNotifications(userId) {
  if (!supabaseClient) return;

  // Realtime channel filter targeting current active user
  supabaseClient
    .channel(`notifs:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, payload => {
      // Append new notification locally and trigger audio/toast alert
      window.notifications.unshift(payload.new);
      updateNotifBadge();
      renderNotificationsList();
      showToast(`Notification: ${payload.new.title}`, 'success');
    })
    .subscribe();
}
```

#### Notifications Frontend Rendering:
```javascript
window.loadNotifications = async function() {
  const res = await apiCall('notifications', { action: 'get_notifications' });
  if (res.success) {
    window.notifications = res.notifications || [];
    updateNotifBadge();
    renderNotificationsList();
  }
};

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unread = window.notifications.filter(n => !n.is_read).length;
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNotificationsList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (window.notifications.length === 0) {
    list.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted);">No notifications</div>`;
    return;
  }
  list.innerHTML = window.notifications.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
      <span class="notif-item-title">${sanitize(n.title)}</span>
      <span class="notif-item-body">${sanitize(n.body)}</span>
      <span class="notif-item-time">${new Date(n.created_at).toLocaleString()}</span>
    </div>
  `).join('');
}

window.toggleNotifPanel = function(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      window.loadNotifications();
    }
  }
};

window.markNotifRead = async function(id) {
  const res = await apiCall('notifications', { action: 'mark_read', id });
  if (res.success) {
    const notif = window.notifications.find(n => n.id === id);
    if (notif) notif.is_read = true;
    updateNotifBadge();
    renderNotificationsList();
  }
};

window.markAllNotifsRead = async function() {
  const res = await apiCall('notifications', { action: 'mark_all_read' });
  if (res.success) {
    window.notifications.forEach(n => n.is_read = true);
    updateNotifBadge();
    renderNotificationsList();
  }
};

// Close notifications dropdown on clicking outside
document.addEventListener('click', () => {
  const panel = document.getElementById('notifPanel');
  if (panel && !panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
  }
});
document.getElementById('notifPanel')?.addEventListener('click', e => e.stopPropagation());
```

#### Dashboard Charts Rendering Logic:
Loads standard data and sets options using custom computed stylesheet colors dynamically.

```javascript
window.renderDashboardCharts = function(tasks, contributions) {
  // Clear any active chart instances to prevent canvas overlapping
  if (chartInstances.status) chartInstances.status.destroy();
  if (chartInstances.trend) chartInstances.trend.destroy();
  if (chartInstances.category) chartInstances.category.destroy();

  // Resolve design system colors from tokens styles at runtime
  const styles = getComputedStyle(document.documentElement);
  const colorAccent = styles.getPropertyValue('--accent').trim();
  const colorText = styles.getPropertyValue('--text-main').trim();
  const colorTextMuted = styles.getPropertyValue('--text-muted').trim();
  const colorBorder = styles.getPropertyValue('--border-medium').trim();

  // Chart 1: Status Doughnut
  const statusCounts = { open: 0, in_progress: 0, developed: 0, in_review: 0, done: 0 };
  tasks.forEach(t => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });
  chartInstances.status = new Chart(document.getElementById('chartTaskStatus'), {
    type: 'doughnut',
    data: {
      labels: ['Open', 'In Progress', 'Developed', 'In Review', 'Approved (Done)'],
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [colorTextMuted, colorAccent, 'rgba(235, 140, 20, 0.95)', 'rgba(30, 144, 255, 0.95)', 'rgba(76, 175, 80, 0.95)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colorText, boxWidth: 12, font: { size: 11, family: 'Courier New' } }
        }
      }
    }
  });

  // Chart 2: Point Contribution Trend Line (Last 30 Days)
  const last30 = [...Array(30)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyPts = {};
  last30.forEach(d => dailyPts[d] = 0);
  contributions.forEach(c => {
    const d = c.created_at?.slice(0, 10);
    if (dailyPts[d] !== undefined) dailyPts[d] += c.points;
  });
  chartInstances.trend = new Chart(document.getElementById('chartContribTrend'), {
    type: 'line',
    data: {
      labels: last30.map(d => d.slice(5)), // MM-DD
      datasets: [{
        label: 'Points',
        data: Object.values(dailyPts),
        borderColor: colorAccent,
        backgroundColor: `rgba(${styles.getPropertyValue('--accent-rgb').trim()}, 0.08)`,
        fill: true,
        tension: 0.35,
        borderWidth: 1.5,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'transparent' }, ticks: { color: colorTextMuted, font: { size: 10 } } },
        y: { grid: { color: colorBorder }, ticks: { color: colorTextMuted, font: { size: 10 } }, beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });

  // Chart 3: Category Task Bar Chart
  const categoriesMap = {};
  tasks.forEach(t => { if (t.category) categoriesMap[t.category] = (categoriesMap[t.category] || 0) + 1; });
  chartInstances.category = new Chart(document.getElementById('chartTaskCategory'), {
    type: 'bar',
    data: {
      labels: Object.keys(categoriesMap),
      datasets: [{
        data: Object.values(categoriesMap),
        backgroundColor: colorAccent,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: colorTextMuted, font: { size: 10 } } },
        y: { grid: { color: colorBorder }, ticks: { color: colorTextMuted, font: { size: 10 } }, beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });
};
```

#### Semester Coverage calculations:
```javascript
window.renderSemesterProgress = function() {
  const el = document.getElementById('semesterProgressList');
  if (!el || !window.appData) return;

  const donePaths = new Set(
    (window.allTasks || []).filter(t => t.status === 'done' && t.target_path).map(t => t.target_path.trim())
  );
  const trackedPaths = new Set(
    (window.allTasks || []).filter(t => t.target_path).map(t => t.target_path.trim())
  );

  let html = '';
  window.appData.semesters.forEach(sem => {
    const totalFiles = sem.totalFiles || 0;
    const semFiles = [];
    (sem.blocks || []).forEach(block => {
      (block.categories || []).forEach(cat => {
        (cat.files || []).forEach(f => semFiles.push(f.path));
      });
    });

    const doneCount = semFiles.filter(p => donePaths.has(p)).length;
    const trackedCount = semFiles.filter(p => trackedPaths.has(p)).length;
    const pct = totalFiles > 0 ? Math.round((doneCount / totalFiles) * 100) : 0;
    const trackedPct = totalFiles > 0 ? Math.round((trackedCount / totalFiles) * 100) : 0;

    const barColor = pct >= 70 ? 'rgba(76, 175, 80, 0.95)' : (pct >= 30 ? 'var(--accent)' : 'var(--border-heavy)');

    html += `
      <div class="sem-progress-item">
        <div class="sem-progress-header">
          <span class="sem-progress-label">${sanitize(sem.title)}</span>
          <span class="sem-progress-stats">
            <span style="color:${barColor}; font-weight:700;">${doneCount}</span>
            <span style="color:var(--text-muted)">/${totalFiles} completed</span>
            <span style="color:var(--text-muted); margin-left:8px;">(${trackedCount} tracked)</span>
          </span>
        </div>
        <div class="sem-progress-bar-track">
          <div class="sem-progress-bar-tracked" style="width:${trackedPct}%;"></div>
          <div class="sem-progress-bar-done" style="width:${pct}%; background:${barColor};"></div>
        </div>
        <div class="sem-progress-pct" style="color:${barColor};">${pct}%</div>
      </div>`;
  });
  el.innerHTML = html;
};
```

#### GitHub Version Control integration:
```javascript
window.showFileHistory = async function(item) {
  document.getElementById('historyTitle').textContent = 'HISTORY: ' + item.name;
  const body = document.getElementById('historyBody');
  body.innerHTML = '<div class="placeholder-text">Pulling commits history from GitHub...</div>';
  document.getElementById('historyModal').classList.add('active');

  const res = await adminAction('get_file_history', { path: item.path });
  if (!res.success) {
    body.innerHTML = `<div style="color:var(--danger); padding:16px;">Failed to fetch history: ${res.error}</div>`;
    return;
  }

  body.innerHTML = res.commits.map(c => `
    <div class="history-commit-item">
      <div class="history-commit-msg">${sanitize(c.message)}</div>
      <div class="history-commit-meta">${sanitize(c.author)} &bull; ${new Date(c.date).toLocaleString()}</div>
      <div class="history-commit-actions">
        <button class="btn-card" onclick="previewAtCommit('${item.path}', '${c.sha}')">Preview</button>
        <button class="btn-card" onclick="restoreToCommit('${item.path}', '${c.sha}', '${sanitize(c.message)}')">Restore</button>
      </div>
    </div>
  `).join('');
};

window.previewAtCommit = async function(path, sha) {
  showToast('Fetching file version...');
  const res = await adminAction('get_file_at_commit', { path, sha });
  if (!res.success) { showToast(`Failed: ${res.error}`, 'error'); return; }
  
  // Decode base64 to readable text
  const fileContent = atob(res.content.replace(/\n/g, ''));
  
  // Pop open read-only preview editor
  const editorModal = document.getElementById('editorModal');
  const codeEditor = document.getElementById('codeEditor');
  const previewFrame = document.getElementById('editorPreview');
  
  document.getElementById('editorTitle').textContent = `PREVIEWING [COMMIT ${sha.slice(0, 7)}]`;
  codeEditor.value = fileContent;
  codeEditor.disabled = true;
  document.getElementById('editorSave').disabled = true;
  
  previewFrame.srcdoc = fileContent;
  editorModal.classList.add('active');
};

window.restoreToCommit = async function(path, sha, commitMsg) {
  const confirm = await customConfirm(`Restore file state to revision: "${commitMsg}"?`);
  if (!confirm) return;

  showToast('Retrieving old file binary...');
  const getRes = await adminAction('get_file_at_commit', { path, sha });
  if (!getRes.success) { showToast(`Failed retrieval: ${getRes.error}`, 'error'); return; }

  const node = window.currentTree.find(n => n.path === path);
  showToast('Pushing restoration commit...');
  
  const uploadRes = await adminAction('upload', {
    path,
    contentBase64: getRes.content, // reuse raw base64 string directly
    sha: node ? node.sha : null,
    message: `Restore ${path} to commit sha ${sha.slice(0, 7)}`
  });

  if (uploadRes.success) {
    showToast('Restoration complete!', 'success');
    document.getElementById('historyModal').classList.remove('active');
    loadTree();
  } else {
    showToast(`Upload failed: ${uploadRes.error}`, 'error');
  }
};
```

#### GitHub Rate Monitor implementation:
```javascript
window.fetchGitHubRateLimit = async function() {
  try {
    const res = await adminAction('get_rate_limit');
    if (res.success && res.core) {
      const { remaining, limit, reset } = res.core;
      const rTime = new Date(reset * 1000).toLocaleTimeString();
      const pct = (remaining / limit) * 100;
      
      let color = 'inherit';
      if (pct < 20) color = 'var(--danger)';
      else if (pct < 50) color = 'rgba(235, 140, 20, 0.95)';

      const el = document.getElementById('ghRateLimit');
      if (el) {
        el.innerHTML = `GH: <span style="color:${color}; font-weight:700;">${remaining}</span>/${limit}`;
        el.title = `GitHub API requests left. Limit resets at ${rTime}`;
      }
    }
  } catch (err) {
    console.warn("GitHub rate monitor lookup error:", err);
  }
};
```

#### Custom templates selection:
```javascript
const ANNOUNCEMENT_TEMPLATES = {
  new_content: '📢 Konten materi baru telah ditambahkan ke sistem! Silakan akses daftar materi untuk mulai belajar.',
  maintenance: '🚧 Perhatian: Sistem akan melakukan maintenance rutin dalam 15 menit mendatang. Selesaikan aktivitas Anda.',
  new_semester: '🎓 Selamat datang di semester baru! Modul dan tugas baru kini telah dipetakan ke syllabus.',
  deadline: '⏰ Pengingat: Batas waktu penyerahan review konten dan task developer untuk minggu ini akan berakhir hari ini.',
  thanks: '🙏 Apresiasi setinggi-tingginya kepada seluruh kontributor yang telah menyelesaikan task minggu ini! Kerja luar biasa!'
};

window.applyAnnouncementTemplate = function(val) {
  if (!val || !ANNOUNCEMENT_TEMPLATES[val]) return;
  const el = document.getElementById('announcementText');
  if (el) {
    el.value = ANNOUNCEMENT_TEMPLATES[val];
    el.focus();
    el.select();
    document.getElementById('announcementTemplate').value = '';
  }
};
```

#### Rebuilding index lists:
```javascript
window.rebuildDataJs = async function() {
  const confirm = await customConfirm('Reconstruct index mapping data.js from the current GitHub file tree? This will overwrite data.js.');
  if (!confirm) return;

  if (!window.currentTree || window.currentTree.length === 0) {
    showToast('Initialize the file list tree first', 'error');
    return;
  }
  showToast('Reconstructing appData structure...');

  const semesterMap = {};

  // Crawl html files located in content/
  window.currentTree
    .filter(n => n.type === 'blob' && n.path.startsWith('content/') && n.path.endsWith('.html'))
    .forEach(n => {
      const parts = n.path.split('/');
      if (parts.length < 4) return;
      const semKey = parts[1].toLowerCase();
      const blockKey = parts[2];
      const filename = parts[3];

      const nameNoExt = filename.replace(/\.html$/i, '');
      const underscoreIdx = nameNoExt.indexOf('_');
      let category, title;

      if (underscoreIdx === -1) {
        category = 'other';
        title = nameNoExt;
      } else {
        const prefix = nameNoExt.slice(0, underscoreIdx).trim();
        title = nameNoExt.slice(underscoreIdx + 1).trim();
        const afterBlock = prefix.replace(blockKey, '').trim();
        category = afterBlock || 'other';
      }

      if (!semesterMap[semKey]) semesterMap[semKey] = { blocks: {} };
      if (!semesterMap[semKey].blocks[blockKey]) semesterMap[semKey].blocks[blockKey] = { categories: {} };
      if (!semesterMap[semKey].blocks[blockKey].categories[category]) {
        semesterMap[semKey].blocks[blockKey].categories[category] = [];
      }

      semesterMap[semKey].blocks[blockKey].categories[category].push({
        id: filename.replace(/\.html$/i, ''),
        title: title,
        type: 'file',
        path: n.path
      });
    });

  // Sort and build appData mapping structures
  const semesters = Object.entries(semesterMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semKey, semVal]) => {
      const blocks = Object.entries(semVal.blocks)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([blockKey, blockVal]) => {
          const categories = Object.entries(blockVal.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([catKey, files]) => ({
              id: `${blockKey} ${catKey}`.trim(),
              title: `${blockKey} ${catKey}`.trim(),
              type: 'category',
              totalFiles: files.length,
              files: files.sort((a, b) => a.title.localeCompare(b.title))
            }));
          const totalFiles = categories.reduce((s, c) => s + c.totalFiles, 0);
          return { id: blockKey, title: `Block ${blockKey}`, type: 'block', totalFiles, categories };
        });
      const totalFiles = blocks.reduce((s, b) => s + b.totalFiles, 0);
      return { id: semKey, title: semKey.toUpperCase(), type: 'semester', totalFiles, blocks };
    });

  const allFiles = [];
  semesters.forEach(sem => {
    sem.blocks.forEach(block => {
      block.categories.forEach(cat => {
        cat.files.forEach(f => {
          allFiles.push({
            id: f.id + '.html',
            title: f.title,
            type: 'file',
            path: f.path,
            category: cat.id,
            blockName: block.id,
            semesterName: sem.id
          });
        });
      });
    });
  });

  const newAppData = { semesters, files: allFiles };
  const newDataContent = 'window.appData = ' + JSON.stringify(newAppData) + ';';

  // Search data.js in existing tree to get SHA
  const dataJsNode = window.currentTree.find(n => n.path === 'data.js');

  showToast('Uploading data.js index to GitHub...');
  const res = await adminAction('upload', {
    path: 'data.js',
    contentBase64: utf8ToBase64(newDataContent),
    sha: dataJsNode ? dataJsNode.sha : null,
    message: `chore: rebuild data.js index [${new Date().toISOString().slice(0, 10)}]`
  });

  if (res.success) {
    showToast(`Index rebuilt successfully! ${allFiles.length} files tracked.`, 'success');
    loadTree();
  } else {
    showToast(`Build failed: ${res.error}`, 'error');
  }
};
```

#### User Profile settings rendering:
```javascript
window.loadProfileView = async function() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profileUsername').value = user.user_metadata?.username || '';

  // Get active user division WhatsApp contact info
  const divRes = await apiCall('divisions', { action: 'get_my_division' });
  if (divRes.success && divRes.division) {
    document.getElementById('profileDivision').value = divRes.division.division_id.toUpperCase();
    document.getElementById('profileWhatsapp').value = divRes.division.whatsapp || '';
  } else {
    document.getElementById('profileDivision').value = 'NO DIVISION SELECTED';
    document.getElementById('profileWhatsapp').value = '';
  }

  // Get point contributions details
  const contribRes = await apiCall('contributions', { action: 'get_my_contributions' });
  if (contribRes.success && contribRes.contributions) {
    renderActivityHeatmap(contribRes.contributions);
  }
};

function renderActivityHeatmap(contributions) {
  const container = document.getElementById('profileHeatmap');
  if (!container) return;

  // Compile contributions points in the last 364 days
  const today = new Date();
  today.setHours(0,0,0,0);
  const trackerMap = {};

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trackerMap[d.toISOString().slice(0, 10)] = 0;
  }

  contributions.forEach(c => {
    const d = c.created_at?.slice(0, 10);
    if (trackerMap[d] !== undefined) trackerMap[d] += c.points;
  });

  const dataPoints = Object.entries(trackerMap);
  const maxPointsVal = Math.max(...Object.values(trackerMap), 1);

  // Setup styles from computing tokens
  const styles = getComputedStyle(document.documentElement);
  const colorAccent = styles.getPropertyValue('--accent').trim();
  const colorBorder = styles.getPropertyValue('--border-light').trim();
  const rgbAccent = styles.getPropertyValue('--accent-rgb').trim();

  const colors = [
    colorBorder,
    `rgba(${rgbAccent}, 0.25)`,
    `rgba(${rgbAccent}, 0.50)`,
    `rgba(${rgbAccent}, 0.75)`,
    colorAccent
  ];

  let html = '<div class="heatmap-grid">';
  let colHtml = '<div class="heatmap-col">';

  dataPoints.forEach(([dStr, count], index) => {
    const intensity = count === 0 ? 0 : Math.ceil((count / maxPointsVal) * 4);
    const bg = colors[intensity];
    const cellTitle = `${dStr}: ${count} points`;

    colHtml += `<div class="heatmap-cell" style="background:${bg}" title="${cellTitle}"></div>`;

    if ((index + 1) % 7 === 0) {
      colHtml += '</div>';
      html += colHtml;
      colHtml = '<div class="heatmap-col">';
    }
  });

  if (dataPoints.length % 7 !== 0) {
    colHtml += '</div>';
    html += colHtml;
  }
  html += '</div>';
  container.innerHTML = html;
}

// Wire form update bindings
document.getElementById('btnSaveProfile')?.addEventListener('click', async () => {
  const username = document.getElementById('profileUsername').value.trim();
  const whatsapp = document.getElementById('profileWhatsapp').value.trim();

  showToast('Updating profile credentials...');
  if (username) {
    const { error } = await supabaseClient.auth.updateUser({ data: { username } });
    if (error) { showToast(`Username update failed: ${error.message}`, 'error'); return; }
  }

  const res = await apiCall('divisions', { action: 'update_whatsapp', whatsapp });
  if (res.success) {
    showToast('Identity updated successfully!', 'success');
    document.getElementById('userBadge').textContent = username || 'User';
  } else {
    showToast(`WhatsApp update failed: ${res.error}`, 'error');
  }
});

document.getElementById('btnChangePassword')?.addEventListener('click', async () => {
  const p1 = document.getElementById('profileNewPassword').value;
  const p2 = document.getElementById('profileConfirmPassword').value;

  if (p1.length < 6) { showToast('Password must be at least 6 characters long', 'error'); return; }
  if (p1 !== p2) { showToast('Passwords do not match', 'error'); return; }

  showToast('Modifying authentication credential...');
  const { error } = await supabaseClient.auth.updateUser({ password: p1 });
  if (error) {
    showToast(`Password update failed: ${error.message}`, 'error');
  } else {
    showToast('Password updated successfully!', 'success');
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
  }
});
```

#### User filtering cohort update inside `applyUserFilters()`:
```javascript
  // Inject this condition check inside applyUserFilters logic:
  if (filter === 'new30') {
    const threshold = Date.now() - (30 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(u => new Date(u.created_at).getTime() > threshold);
  } else if (filter === 'thismonth') {
    const now = new Date();
    filtered = filtered.filter(u => {
      const d = new Date(u.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }
```

#### User card registration labels inside `renderUsers()`:
```javascript
  // Append within card body template in renderUsers()
  const registerDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';
  card.innerHTML += `<div class="user-join-date" style="font-size:10px; color:var(--text-muted); margin-top:4px;">Joined: ${registerDate}</div>`;
```

#### Invite Links UI generator logic inside `viewUsers` tab:
```javascript
window.loadInvitesPanel = async function() {
  const res = await apiCall('invites', { action: 'list_invites' });
  const container = document.getElementById('inviteList');
  if (!container) return;

  if (res.success && res.invites) {
    if (res.invites.length === 0) {
      container.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">No active invite links</div>`;
      return;
    }
    const rootUrl = window.location.origin;
    container.innerHTML = res.invites.map(inv => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-light);">
        <div style="font-size:12px;">
          <a href="${rootUrl}/?invite=${inv.token}" target="_blank" style="color:var(--accent); font-weight:700;">invite:${inv.token.slice(0, 8)}...</a>
          <div style="font-size:10px; color:var(--text-muted);">${inv.note || 'No note'} &bull; Exp: ${new Date(inv.expires_at).toLocaleDateString()}</div>
        </div>
        <button class="btn-card" onclick="revokeInviteToken('${inv.id}')">Revoke</button>
      </div>
    `).join('');
  }
};

document.getElementById('btnGenerateInvite')?.addEventListener('click', async () => {
  const note = document.getElementById('inviteNote').value.trim();
  const res = await apiCall('invites', { action: 'create_invite', note });
  if (res.success) {
    showToast('Token invite generated!', 'success');
    document.getElementById('inviteNote').value = '';
    window.loadInvitesPanel();
  } else {
    showToast(`Failed: ${res.error}`, 'error');
  }
});

window.revokeInviteToken = async function(tokenId) {
  const confirm = await customConfirm('Permanently revoke this invitation token?');
  if (!confirm) return;

  const res = await apiCall('invites', { action: 'revoke_invite', token_id: tokenId });
  if (res.success) {
    showToast('Token revoked!', 'success');
    window.loadInvitesPanel();
  } else {
    showToast(`Revocation failed: ${res.error}`, 'error');
  }
};
```

#### Content health checker:
```javascript
window.runHealthCheck = async function() {
  if (!window.appData) { showToast('Metadata appData not loaded', 'error'); return; }
  const valDisplay = document.getElementById('healthStatus');
  const triggerBtn = document.getElementById('btnHealthCheck');

  triggerBtn.disabled = true;
  valDisplay.textContent = 'Scanning...';

  const files = window.appData.files || [];
  const CONCURRENCY_MAX = 5;
  
  let validCount = 0;
  let brokenCount = 0;
  let processedCount = 0;
  const brokenLinksList = [];

  for (let i = 0; i < files.length; i += CONCURRENCY_MAX) {
    const chunk = files.slice(i, i + CONCURRENCY_MAX);
    await Promise.all(chunk.map(async f => {
      try {
        const fileUrl = `${GITHUB_RAW_BASE}/${f.path}`;
        const headRes = await fetch(fileUrl, { method: 'HEAD', cache: 'no-store' });
        if (headRes.ok) {
          validCount++;
        } else {
          brokenCount++;
          brokenLinksList.push(f.path);
        }
      } catch (err) {
        brokenCount++;
        brokenLinksList.push(f.path);
      }
      processedCount++;
      valDisplay.textContent = `${processedCount}/${files.length} verified...`;
    }));
  }

  const statusColor = brokenCount === 0 ? 'var(--text-main)' : 'var(--danger)';
  valDisplay.innerHTML = `<span style="color:${statusColor}; font-weight:700;">${validCount}</span><span style="color:var(--text-muted); font-size:13px;">/${files.length} OK</span>`;
  
  if (brokenCount > 0) {
    showToast(`${brokenCount} missing/broken files detected. Check logs.`, 'error');
    console.warn("Broken target index paths on GitHub repository:", brokenLinksList);
  } else {
    showToast("All syllabus files are fully indexed on GitHub!", "success");
  }
  triggerBtn.disabled = false;
};
```

---

### 4b. Workflow Logic Enhancements — `admin-workflow.js`

Incorporate task edits, task deletes, priority badges, calendar view compilation, drag-and-drop CSV parser wizards, point exports, comments, and force reassignments in [admin-workflow.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/admin-workflow.js).

#### Hapus Dead Code Scrapper:
Remove lines 779-903 containing scrapper selectors, event handlers, and methods (`btnLoadReviewFile`, `reviewFilePath`, etc.) completely.

#### Priority Color mapping:
```javascript
// Global colors mapped to CSS style variables
const priorityColors = {
  urgent: 'var(--danger)',
  high: 'var(--accent)',
  normal: 'var(--text-muted)',
  low: 'var(--border-heavy)'
};
```

#### Task Edit, Delete, Duplicate & Force Reassign buttons inside `openTaskModal(task)`:
Update the modal actions generation inside `openTaskModal` logic to inject context-aware control buttons.

```javascript
  let actionsHtml = '';
  
  // Re-assign & Workflow adjustments (Management Only)
  if (isAdminUser || currentUserDivision === 'management') {
    actionsHtml += `<button class="btn-unified" onclick="editTaskModal('${task.id}')">Edit Task</button>`;
    actionsHtml += `<button class="btn-unified" onclick="cloneTask('${task.id}')">Clone</button>`;
    
    if (['open', 'in_progress', 'developed'].includes(task.status)) {
      actionsHtml += `<button class="btn-unified" onclick="promptReassignTask('${task.id}')">Reassign</button>`;
    }
  }

  // Approved Done operations triggers
  if (task.status === 'open' && (currentUserDivision === 'development' || isAdminUser)) {
    actionsHtml += `<button class="btn-unified primary" onclick="claimTask('${task.id}')">Claim Task</button>`;
  } else if (task.status === 'in_progress' && (task.assigned_to === currentUserId || isAdminUser)) {
    actionsHtml += `<button class="btn-unified" onclick="unclaimTask('${task.id}')">Unclaim</button>`;
    actionsHtml += `<button class="btn-unified primary" onclick="openSubmitModal('${task.id}')">Submit for Review</button>`;
  } else if (task.status === 'developed' && (currentUserDivision === 'review' || isAdminUser)) {
    actionsHtml += `<button class="btn-unified primary" onclick="startReview('${task.id}')">Start Review</button>`;
  } else if (task.status === 'in_review' && (currentUserDivision === 'review' || isAdminUser)) {
    actionsHtml += `<button class="btn-unified" onclick="openRejectModal('${task.id}')" style="border-color:var(--danger); color:var(--danger);">Reject</button>`;
    actionsHtml += `<button class="btn-unified primary" onclick="approveTask('${task.id}')">Approve</button>`;
  }

  // Delete Action (Admin Only)
  if (window.isSuperAdmin) {
    actionsHtml += `<button class="btn-unified" style="border-color:var(--danger); color:var(--danger);" onclick="deleteTask('${task.id}')">Delete</button>`;
  }
```

#### Comments list replacement layout:
Append this layout template inside the details modal view block rendering:

```javascript
  // Inject Comment Thread UI directly into the Task Modal details layout
  const commentUi = `
    <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border-light);">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">Task Comments</div>
      
      <!-- Input -->
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input type="text" id="taskCommentInput_${task.id}" class="auth-input" style="flex:1; font-size:12px; height:32px;" placeholder="Add comment...">
        <button class="btn-unified primary" style="height:32px; padding:0 12px; font-size:12px;" onclick="submitTaskComment('${task.id}')">Post</button>
      </div>

      <!-- Scroll comments -->
      <div id="taskCommentsContainer_${task.id}" style="max-height:180px; overflow-y:auto; margin-bottom:12px;">
        <div style="text-align:center; color:var(--text-muted); font-size:11px; padding:10px;">Loading thread...</div>
      </div>

      <!-- Logs -->
      <div>
        <button class="btn-card" style="width:100%; justify-content:center; font-size:11px; padding:6px 0;" onclick="toggleSystemLogs('${task.id}')">
          ▶ Show Audit Log History
        </button>
        <div id="taskSystemLogs_${task.id}" class="hidden" style="margin-top:10px; max-height:120px; overflow-y:auto; border-top:1px solid var(--border-light); padding-top:8px;"></div>
      </div>
    </div>
  `;
```

#### Task Comment thread actions:
```javascript
window.submitTaskComment = async function(taskId) {
  const elInput = document.getElementById(`taskCommentInput_${taskId}`);
  const note = elInput?.value?.trim();
  if (!note) return;

  elInput.value = '';
  elInput.disabled = true;
  const res = await apiCall('tasks', { action: 'add_task_note', task_id: taskId, note });
  elInput.disabled = false;

  if (res.success) {
    window.loadTaskComments(taskId);
  } else {
    showToast(`Post failed: ${res.error}`, 'error');
  }
};

window.loadTaskComments = async function(taskId) {
  const wrapper = document.getElementById(`taskCommentsContainer_${taskId}`);
  if (!wrapper) return;

  const res = await apiCall('tasks', { action: 'get_task_logs', task_id: taskId });
  if (!res.success) {
    wrapper.innerHTML = `<div style="color:var(--danger); font-size:11px; padding:8px;">Failed to fetch notes thread</div>`;
    return;
  }

  const comments = res.logs.filter(l => l.action === 'commented');
  const sysLogs = res.logs.filter(l => l.action !== 'commented');

  wrapper.innerHTML = comments.length === 0
    ? `<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:12px;">No comments yet</div>`
    : comments.reverse().map(c => `
      <div style="padding:6px 0; border-bottom:1px dashed var(--border-light); font-size:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="font-weight:700; color:var(--accent);">${c.user ? (c.user.username || c.user.email.split('@')[0]) : 'Unknown'}</span>
          <span style="font-size:10px; color:var(--text-muted);">${new Date(c.created_at).toLocaleString()}</span>
        </div>
        <div style="white-space:pre-wrap; line-height:1.3;">${sanitize(c.note)}</div>
      </div>
    `).join('');
  wrapper.scrollTop = wrapper.scrollHeight;

  const logPanel = document.getElementById(`taskSystemLogs_${taskId}`);
  if (logPanel) {
    logPanel.innerHTML = sysLogs.length === 0
      ? `<div style="font-size:11px; color:var(--text-muted);">No system modifications logged</div>`
      : sysLogs.map(l => `
        <div style="font-size:11px; padding:4px 0; border-bottom:1px solid var(--border-light);">
          <span style="color:var(--accent); font-weight:700;">${l.action.toUpperCase()}</span> by <b>${l.user ? (l.user.username || l.user.email.split('@')[0]) : 'System'}</b>
          <div style="font-size:9px; color:var(--text-muted);">${new Date(l.created_at).toLocaleString()}</div>
          ${l.note ? `<div style="font-style:italic; color:var(--text-muted); margin-top:2px;">"${sanitize(l.note)}"</div>` : ''}
        </div>
      `).join('');
  }
};

window.toggleSystemLogs = function(taskId) {
  const el = document.getElementById(`taskSystemLogs_${taskId}`);
  if (!el) return;
  const isCollapsed = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  
  const btn = el.previousElementSibling;
  if (btn) btn.textContent = isCollapsed ? '▼ Hide Audit Log History' : '▶ Show Audit Log History';
  if (isCollapsed && el.innerHTML.trim() === '') {
    window.loadTaskComments(taskId);
  }
};
```

#### Task Modal trigger hook additions:
```javascript
// Append at the end of openTaskModal(task):
setTimeout(() => window.loadTaskComments(task.id), 120);
```

#### Task Modal Edit, Delete, Duplicate & Force Reassign execution:
```javascript
window.editTaskModal = function(taskId) {
  const task = window.allTasks.find(t => t.id === taskId);
  if (!task) return;

  // Pre-populate input configurations
  document.getElementById('taskTitle').value = task.title || '';
  document.getElementById('taskCategory').value = task.category || 'CBT';
  document.getElementById('taskPriority').value = task.priority || 'normal';
  document.getElementById('taskSemester').value = String(task.semester || '1');
  document.getElementById('taskBlock').value = task.block || '';
  document.getElementById('taskDueDate').value = task.due_date || '';
  document.getElementById('taskTargetPath').value = task.target_path || '';
  document.getElementById('taskDescription').value = task.description || '';

  // Configure assignees mapping
  const assignSelect = document.getElementById('taskAssignTo');
  if (assignSelect) {
    assignSelect.value = ''; // fallback
    for (let i = 0; i < assignSelect.options.length; i++) {
      if (assignSelect.options[i].text === task.assignee_email) {
        assignSelect.selectedIndex = i;
        break;
      }
    }
  }

  // Set editing configurations variables
  window._editingTaskId = taskId;
  document.querySelector('#createTaskModal .modal-title').textContent = 'EDIT TARGET TASK';
  document.getElementById('taskConfirm').textContent = 'Save Changes';

  // Toggle visible overlays
  document.getElementById('contextModal').classList.remove('active');
  document.getElementById('createTaskModal').classList.add('active');
};

window.deleteTask = async function(taskId) {
  const confirm = await customConfirm('Permanently delete this task and all related notes logs? This cannot be undone.');
  if (!confirm) return;

  showToast('Deleting task...');
  const res = await apiCall('tasks', { action: 'delete_task', task_id: taskId });
  if (res.success) {
    showToast('Task deleted successfully!', 'success');
    document.getElementById('contextModal').classList.remove('active');
    loadTasks();
  } else {
    showToast(`Deletion failed: ${res.error}`, 'error');
  }
};

window.cloneTask = function(taskId) {
  const task = window.allTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('contextModal').classList.remove('active');

  // Load clone metadata cache
  window._cloneSource = {
    title: `CLONE: ${task.title}`,
    category: task.category,
    priority: task.priority,
    semester: task.semester,
    block: task.block,
    description: task.description || '',
    target_path: '' // clear target path for safety
  };

  window.createNewTaskPrompt();
};

window.promptReassignTask = async function(taskId) {
  const divRes = await apiCall('divisions', { action: 'get_divisions' });
  if (!divRes.success) { showToast('Could not query divisions lists', 'error'); return; }

  const devs = divRes.divisions.find(d => d.id === 'development')?.members || [];
  if (devs.length === 0) { showToast('No members found in Development division', 'error'); return; }

  const modal = document.getElementById('promptModal');
  const title = document.getElementById('promptTitle');
  const input = document.getElementById('promptInput');
  const btnCancel = document.getElementById('promptCancel');
  const btnConfirm = document.getElementById('promptConfirm');

  title.textContent = 'Force Re-assign To:';

  // Temporarily replace text input with dropdown select elements
  const select = document.createElement('select');
  select.className = input.className;
  select.id = 'reassignSelect';
  select.innerHTML = '<option value="">-- Unassigned (Return to Open) --</option>' +
    devs.map(d => `<option value="${d.email}">${sanitize(d.username || d.email.split('@')[0])}</option>`).join('');

  input.replaceWith(select);
  input.style.display = 'none';
  modal.classList.add('active');

  return new Promise(resolve => {
    const restoreInput = () => {
      modal.classList.remove('active');
      document.getElementById('reassignSelect')?.replaceWith(input);
      input.style.display = 'block';
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
    };

    btnCancel.onclick = () => { restoreInput(); resolve(); };
    btnConfirm.onclick = async () => {
      const email = document.getElementById('reassignSelect')?.value;
      restoreInput();
      document.getElementById('contextModal').classList.remove('active');
      showToast('Re-assigning task...');

      const res = await apiCall('tasks', { action: 'reassign_task', task_id: taskId, new_assignee_email: email || null });
      if (res.success) {
        showToast('Task re-assigned!', 'success');
        loadTasks();
      } else {
        showToast(`Failed: ${res.error}`, 'error');
      }
      resolve();
    };
  });
};
```

#### Modify `createNewTaskPrompt` inside `admin-workflow.js` (~line 298):
```javascript
window.createNewTaskPrompt = function() {
  const modal = document.getElementById('createTaskModal');
  const title = document.querySelector('#createTaskModal .modal-title');
  const confirmBtn = document.getElementById('taskConfirm');

  window._editingTaskId = null; // Ensure create mode
  confirmBtn.textContent = 'Create Task';

  if (window._cloneSource) {
    title.textContent = 'CLONE TASK';
    document.getElementById('taskTitle').value = window._cloneSource.title;
    document.getElementById('taskCategory').value = window._cloneSource.category || 'CBT';
    document.getElementById('taskPriority').value = window._cloneSource.priority || 'normal';
    document.getElementById('taskSemester').value = String(window._cloneSource.semester || '1');
    document.getElementById('taskBlock').value = window._cloneSource.block;
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskAssignTo').value = '';
    document.getElementById('taskTargetPath').value = '';
    document.getElementById('taskDescription').value = window._cloneSource.description;
    window._cloneSource = null; // Clear cache
  } else {
    title.textContent = 'CREATE NEW CONTENT TASK';
    // Clear forms inputs
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskBlock').value = '';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskAssignTo').value = '';
    document.getElementById('taskTargetPath').value = window._prefilledTaskPath || '';
    document.getElementById('taskDescription').value = '';
    window._prefilledTaskPath = null;
  }
  modal.classList.add('active');
};
```

#### Modify form confirm trigger event listener inside `admin-workflow.js`:
```javascript
document.getElementById('taskConfirm')?.addEventListener('click', async () => {
  const payload = {
    title: document.getElementById('taskTitle').value.trim(),
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    semester: parseInt(document.getElementById('taskSemester').value, 10),
    block: document.getElementById('taskBlock').value.trim(),
    due_date: document.getElementById('taskDueDate').value || null,
    assigned_to_email: document.getElementById('taskAssignTo').value || null,
    target_path: document.getElementById('taskTargetPath').value.trim() || null,
    description: document.getElementById('taskDescription').value.trim()
  };

  if (!payload.title || !payload.block) {
    showToast('Title and Block parameters are required', 'error');
    return;
  }

  showToast('Saving task configurations...');
  let res;
  if (window._editingTaskId) {
    res = await apiCall('tasks', { action: 'edit_task', task_id: window._editingTaskId, ...payload });
  } else {
    res = await apiCall('tasks', { action: 'create_task', ...payload });
  }

  if (res.success) {
    showToast(window._editingTaskId ? 'Task updated!' : 'Task created successfully!', 'success');
    document.getElementById('createTaskModal').classList.remove('active');
    loadTasks();
  } else {
    showToast(`Operation failed: ${res.error}`, 'error');
  }
});
```

#### Priority Badges injection logic inside Kanban Board and Syllabus Tables:
Modify [admin-workflow.js](file:///d:/DOWNLOAD/MR-CAPSULES-main/admin-workflow.js) rendering mechanisms.

##### Inside `renderKanban(tasks)` (~line 228):
```javascript
    // Inside the tasks iteration loop in renderKanban:
    const prioColor = priorityColors[task.priority] || priorityColors.normal;
    const prioBadge = task.priority && task.priority !== 'normal'
      ? `<span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:2px 7px; border-radius:var(--radius-pill); border:1.5px solid ${prioColor}; color:${prioColor}; margin-bottom:8px;">${task.priority}</span>`
      : '';
```
Insert the `${prioBadge}` immediately above the task title in the generated card HTML templates.

##### Inside `renderTasksAsSyllabus(tasks)` (~line 416):
```javascript
    // Inside syllabus rows construction:
    const prioColor = priorityColors[t.priority] || priorityColors.normal;
    const prioBadge = t.priority && t.priority !== 'normal'
      ? `<span class="badge" style="margin-left:6px; border:1px solid ${prioColor}; color:${prioColor}; background:transparent; padding:2px 6px; font-size:9px;">${t.priority.toUpperCase()}</span>`
      : '';
```
Append the `${prioBadge}` right next to the status badge in the 4th column (`<td>`) element:
```javascript
    `<td class="syllabus-table-td"><span class="badge ${badgeClass}">${t.status.toUpperCase()}</span>${prioBadge}</td>`
```

#### CSV Import Wizard client logic:
```javascript
// CSV Drag & Drop triggers setups
const dropZone = document.getElementById('importDropArea');
const csvInput = document.getElementById('csvFileInput');

document.getElementById('btnImportCSV')?.addEventListener('click', () => {
  document.getElementById('importCsvStep1').classList.remove('hidden');
  document.getElementById('importCsvStep2').classList.add('hidden');
  document.getElementById('importCsvBack').classList.add('hidden');
  document.getElementById('importCsvConfirm').classList.add('hidden');
  document.getElementById('importCsvModal').classList.add('active');
  csvInput.value = '';
});

document.getElementById('importCsvBrowse')?.addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', e => handleCSVFiles(e.target.files));

dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('highlight'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('highlight'));
dropZone?.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('highlight');
  handleCSVFiles(e.dataTransfer.files);
});

function handleCSVFiles(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file.name.endsWith('.csv')) { showToast('Invalid file format. Select CSV.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = e => processCSVText(e.target.result);
  reader.readAsText(file);
}

function processCSVText(text) {
  const rows = parseCSV(text);
  window._parsedImportRows = rows;

  const tbody = document.querySelector('#importPreviewTable tbody');
  tbody.innerHTML = '';
  
  let errorCount = 0;
  rows.forEach(r => {
    const errs = validateRow(r);
    r.errors = errs;
    if (errs.length > 0) errorCount++;

    tbody.innerHTML += `
      <tr>
        <td class="syllabus-table-td">${sanitize(r.title || '')}</td>
        <td class="syllabus-table-td">${sanitize(r.category || '')}</td>
        <td class="syllabus-table-td">${sanitize(r.priority || 'normal')}</td>
        <td class="syllabus-table-td">${sanitize(r.semester || '')}</td>
        <td class="syllabus-table-td">${sanitize(r.block || '')}</td>
        <td class="syllabus-table-td" style="color:var(--danger); font-size:10px;">${errs.join(', ')}</td>
      </tr>
    `;
  });

  document.getElementById('importPreviewInfo').textContent = `${rows.length} rows detected (${errorCount} validation errors)`;
  document.getElementById('importCsvStep1').classList.add('hidden');
  document.getElementById('importCsvStep2').classList.remove('hidden');
  document.getElementById('importCsvBack').classList.remove('hidden');
  
  const confirmBtn = document.getElementById('importCsvConfirm');
  confirmBtn.classList.remove('hidden');
  confirmBtn.disabled = (errorCount > 0);
  confirmBtn.textContent = `Import ${rows.length} Tasks`;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const cols = [];
    let inQuotes = false;
    let curr = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cols.push(curr.trim().replace(/^"|"$/g, ''));
        curr = '';
      } else {
        curr += c;
      }
    }
    cols.push(curr.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, index) => [h, cols[index] || '']));
  });
}

function validateRow(row) {
  const errs = [];
  if (!row.title) errs.push('Missing Title');
  if (!row.category || !['CBT', 'OSCE', 'Video', 'Summary'].includes(row.category)) errs.push('Invalid Category');
  if (!row.semester || isNaN(parseInt(row.semester, 10))) errs.push('Semester must be integer');
  if (!row.block) errs.push('Missing Block');
  return errs;
}

document.getElementById('importCsvConfirm')?.addEventListener('click', async () => {
  const rows = window._parsedImportRows;
  if (!rows || rows.length === 0) return;

  const btnConfirm = document.getElementById('importCsvConfirm');
  const btnBack = document.getElementById('importCsvBack');
  const progressWrapper = document.getElementById('importProgressWrapper');
  const bar = document.getElementById('importProgressBar');
  const label = document.getElementById('importProgressText');

  btnConfirm.disabled = true;
  btnBack.classList.add('hidden');
  progressWrapper.classList.remove('hidden');

  let successCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pct = ((i + 1) / rows.length) * 100;
    bar.style.width = `${pct}%`;
    label.textContent = `Uploading ${i + 1}/${rows.length}: ${row.title}...`;

    const res = await apiCall('tasks', {
      action: 'create_task',
      title: row.title,
      category: row.category,
      priority: row.priority || 'normal',
      semester: parseInt(row.semester, 10),
      block: row.block,
      description: row.description || '',
      due_date: row.due_date || null,
      target_path: row.target_path || null,
      assigned_to_email: row.assignee_email || null
    });

    if (res.success) successCount++;
    await new Promise(r => setTimeout(r, 200)); // sleep to satisfy rate controls
  }

  label.textContent = `Completed: ${successCount}/${rows.length} successfully imported!`;
  setTimeout(() => {
    document.getElementById('importCsvModal').classList.remove('active');
    loadTasks();
  }, 2200);
});

// Direct dynamic CSV templates download helper
document.getElementById('btnDownloadTemplate')?.addEventListener('click', (e) => {
  e.preventDefault();
  const rawCSV = 'title,category,priority,semester,block,description,target_path,assignee_email\n' +
    'Farmakologi Dasar,CBT,high,3,Block 1.5,Re-write multiple choice answers,content/semester 3/1.5/1.5 CBT_farma.html,\n';
  const blob = new Blob([rawCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
});
```

#### Contribution Leaderboard Export handler:
```javascript
document.getElementById('btnExportContribs')?.addEventListener('click', async () => {
  showToast('Fetching contributions stats...');
  const res = await apiCall('contributions', { action: 'get_leaderboard' });
  if (!res.success) { showToast('Leaderboard fetch failed', 'error'); return; }

  const rows = [['Rank', 'Username', 'Email', 'Total Points']];
  res.leaderboard.forEach((u, i) => {
    rows.push([
      i + 1,
      u.username || u.email.split('@')[0],
      u.email,
      u.points
    ]);
  });

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leaderboard_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Contributions data exported!', 'success');
});
```

#### Calendar View compilation and day popups logic:
```javascript
window.calCurrentDate = new Date();

window.renderCalendar = function(tasks) {
  const year = window.calCurrentDate.getFullYear();
  const month = window.calCurrentDate.getMonth();

  document.getElementById('calMonthLabel').textContent =
    window.calCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Group tasks by due dates
  const taskMap = {};
  tasks.forEach(t => {
    if (t.due_date) {
      const key = t.due_date;
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    }
  });

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  // Weekday Headers
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(dName => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = dName;
    grid.appendChild(h);
  });

  // Leading empty offsets
  const offset = new Date(year, month, 1).getDay();
  for (let i = 0; i < offset; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day empty';
    grid.appendChild(cell);
  }

  // Monthly days
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  for (let day = 1; day <= daysCount; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = taskMap[dateStr] || [];

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    if (isToday) cell.classList.add('cal-day-today');

    cell.innerHTML = `<div class="cal-day-num">${day}</div>`;

    if (dayTasks.length > 0) {
      const dotsHtml = dayTasks.slice(0, 3).map(t => {
        const color = priorityColors[t.priority] || priorityColors.normal;
        return `<span class="cal-dot" style="background:${color}" title="${sanitize(t.title)}"></span>`;
      }).join('');

      cell.innerHTML += `<div class="cal-dots">${dotsHtml}${dayTasks.length > 3 ? `<span class="cal-more">+${dayTasks.length - 3}</span>` : ''}</div>`;
      cell.onclick = () => showCalDayPopup(dateStr, dayTasks);
    }

    grid.appendChild(cell);
  }

  // Navigations
  document.getElementById('calPrev').onclick = () => {
    window.calCurrentDate.setMonth(window.calCurrentDate.getMonth() - 1);
    window.renderCalendar(window.allTasks);
  };
  document.getElementById('calNext').onclick = () => {
    window.calCurrentDate.setMonth(window.calCurrentDate.getMonth() + 1);
    window.renderCalendar(window.allTasks);
  };
};

function showCalDayPopup(dateStr, tasks) {
  document.getElementById('contextTitle').textContent = `Due Tasks: ${dateStr}`;
  const list = document.getElementById('contextActions');
  
  list.innerHTML = tasks.map(t => `
    <div class="cal-popup-task" onclick="document.getElementById('contextModal').classList.remove('active'); openTaskModal(window.allTasks.find(x => x.id === '${t.id}'))">
      <div class="cal-popup-task-title">${sanitize(t.title)}</div>
      <div class="cal-popup-task-meta">${sanitize(t.category)} &bull; ${t.status.toUpperCase()}</div>
    </div>
  `).join('');
  document.getElementById('contextModal').classList.add('active');
}
```

#### Route and rendering adjustments inside view toggles:
```javascript
// Add inside toggleTasksView(view):
const kanban = document.getElementById('taskKanban');
const syllabus = document.getElementById('syllabusTableContainer');
const calendar = document.getElementById('calendarContainer');

kanban.classList.add('hidden');
syllabus.classList.add('hidden');
calendar.classList.add('hidden');

if (view === 'kanban') {
  kanban.classList.remove('hidden');
} else if (view === 'syllabus') {
  syllabus.classList.remove('hidden');
} else if (view === 'calendar') {
  calendar.classList.remove('hidden');
  window.renderCalendar(window.allTasks || []);
}
```

#### Division join request list interface:
```javascript
window.loadPendingRequests = async function() {
  const res = await apiCall('divisions', { action: 'get_pending_requests' });
  const section = document.getElementById('pendingRequestsSection');
  const badge = document.getElementById('pendingRequestsBadge');
  const list = document.getElementById('pendingRequestsList');

  // Only expose for admin / management roles
  const isMgmt = window.currentUserDivision === 'management' || window.isSuperAdmin;
  if (!isMgmt || !res.success || !res.requests || res.requests.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  badge.textContent = res.requests.length;
  list.innerHTML = res.requests.map(r => `
    <div class="pending-request-item">
      <div class="pending-request-meta">
        <div>User: <b>${sanitize(r.username)}</b> (${sanitize(r.email)})</div>
        <div>Requests access to: <span class="badge" style="background:var(--accent-soft); color:var(--accent); font-weight:700;">${r.division_id.toUpperCase()}</span></div>
        ${r.whatsapp ? `<div>WhatsApp Contact: <a href="https://wa.me/${r.whatsapp}" target="_blank" style="color:var(--accent); text-decoration:underline;">+${r.whatsapp}</a></div>` : ''}
        <div style="font-size:10px; color:var(--text-muted);">Submitted: ${new Date(r.requested_at).toLocaleString()}</div>
      </div>
      <div class="pending-request-actions">
        <button class="btn-card" onclick="reviewJoinRequest('${r.id}', false)" style="border-color:var(--danger); color:var(--danger);">Decline</button>
        <button class="btn-unified primary" onclick="reviewJoinRequest('${r.id}', true)">Approve</button>
      </div>
    </div>
  `).join('');
};

window.reviewJoinRequest = async function(requestId, approved) {
  showToast(approved ? 'Approving access entry...' : 'Declining request...');
  const res = await apiCall('divisions', { action: 'review_request', request_id: requestId, approved });
  if (res.success) {
    showToast(approved ? 'Request approved!' : 'Request rejected.', 'success');
    window.loadPendingRequests();
    if (window.loadDivisions) window.loadDivisions();
  } else {
    showToast(`Action failed: ${res.error}`, 'error');
  }
};

window.togglePendingSection = function() {
  const el = document.getElementById('pendingRequestsList');
  if (el) el.classList.toggle('hidden');
};
```

#### Realtime subscription hooks for division requests:
```javascript
function initRealtimeDivisions() {
  if (!supabaseClient) return;

  // Realtime reload divisions pending listings on insertions/updates
  supabaseClient
    .channel('realtime:division_requests')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'division_requests' }, () => {
      window.loadPendingRequests();
    })
    .subscribe();
}
```

#### Client settings binding hooks for dock tabs navigation click:
```javascript
// Inside the tab element forEach click listener in admin-workflow.js, append:
const target = this.getAttribute('data-target');
if (target === 'viewProfile') {
  window.loadProfileView();
} else if (target === 'viewUsers') {
  window.loadPendingRequests();
  window.loadInvitesPanel();
}
```

---

### 4c. Main Page Integration — `index.html` & `fp.js`

Ensure invitation code parameters are intercepted during guest onboarding, and filter realtime broadcast announcement channels by target divisions.

#### Intercept Invitation token query parameter during onboarding:
```javascript
// Inside the signup click handler / setup code:
const urlParams = new URLSearchParams(window.location.search);
const inviteToken = urlParams.get('invite');
if (inviteToken) {
  // Store invite token globally for verification
  window._activeSignupInviteToken = inviteToken;
  
  // Verify token is active
  fetch('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate_invite', token: inviteToken })
  })
  .then(r => r.json())
  .then(res => {
    if (!res.valid) {
      alert("This signup invite token is invalid, expired, or has already been used.");
      window.location.href = window.location.origin;
    }
  });
}
```

#### Verify and consume token during Auth Sign Up callback:
```javascript
// Inside the sign-up submission trigger, prior to user creation:
if (window._activeSignupInviteToken) {
  const checkRes = await fetch('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate_invite', token: window._activeSignupInviteToken })
  });
  const checkData = await checkRes.json();
  if (!checkData.valid) {
    alert("Sign-up aborted. The invitation link has expired or been revoked.");
    return;
  }
}

// ... execute supabase.auth.signUp() ...

// Directly after successful user signup return:
if (window._activeSignupInviteToken && signUpResult.user) {
  await fetch('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'consume_invite',
      token: window._activeSignupInviteToken,
      new_user_id: signUpResult.user.id
    })
  });
}
```

#### Filter broadcasts target divisions:
```javascript
// Modify the channel.on('broadcast', { event: 'announcement' }) block inside index.html (~line 1385):
      }).on('broadcast', { event: 'announcement' }, (payload) => {
        const msg = payload.payload.message;
        const target = payload.payload.target_division || 'all';
        const myDiv = window.currentUserDivision || null;
        
        // Suppress notification if target does not match current user division
        if (target !== 'all' && myDiv !== target) return;

        if(msg) {
          const tContainer = document.getElementById('toastContainer');
          if(tContainer) {
            const toast = document.createElement('div');
            toast.style.cssText = 'background:var(--bg-main); color:var(--text-main); border:var(--border-main); border-radius:var(--radius-card); padding:12px 24px; font-weight:bold; box-shadow:4px 4px 0 var(--border-medium); transform:translateY(-20px); opacity:0; transition:0.3s; pointer-events:auto; font-size:14px;';
            toast.textContent = "[ANNOUNCEMENT] " + String(msg);
            tContainer.appendChild(toast);
            requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
            setTimeout(() => {
              toast.style.opacity = '0';
              toast.style.transform = 'translateY(-20px)';
              setTimeout(() => toast.remove(), 300);
            }, 6000);
          }
        }
```

---

## 5. Verification & Testing Protocol

Execute the following testing cycles to confirm the correct execution of all 24 features.

### 1. Verification of Task Edit, Delete & Clone (Tiers 1a, A1)
*   **Step 1**: Log in as an administrator. Navigate to the **Tasks** tab and select **Syllabus** view.
*   **Step 2**: Click on any active task. Verify the presence of **Edit Task** and **Clone** buttons.
*   **Step 3**: Click **Edit Task**. Modify the Title, set the Priority to `high`, and choose a specific due date. Save changes. Verify that the table updates immediately and the priority badge appears in the row.
*   **Step 4**: Click on the same task, then click **Clone**. Verify that the creation modal opens pre-filled with the title prefixed by `CLONE:` and all parameters match the parent task, excluding the due date which must be blank.

### 2. Verification of Notifications & Realtime Channels (Tier 2a)
*   **Step 1**: Log in as a developer user on Browser A, and an administrator on Browser B.
*   **Step 2**: On Browser B, click **Edit Task** for an unassigned task. In the *Assign To* field, select the email of the developer logged in on Browser A. Save changes.
*   **Step 3**: Verify that Browser A receives an instant notification toast.
*   **Step 4**: On Browser A, click the **Notifs** tab in the dock. The badge counter should read `1` and the panel should display: `Task Assigned: [Title]`.
*   **Step 5**: Click the notification. Verify that the unread styling is removed and the badge counter decreases to `0`.

### 2b. Verification of Dashboard Charts (Tier 2b)
*   **Step 1**: Open the **Dashboard** tab. Verify that the Status Doughnut, point Contribution Line, and Category Bar charts render correctly.
*   **Step 2**: Toggle the dashboard theme. Verify that chart elements dynamically redraw with the appropriate computed color scheme (e.g., matching dark or mrs theme styles).

### 4. Verification of CSV Import & Exports (Tiers 2d, B4)
*   **Step 1**: Navigate to the **Tasks** tab and click **Import CSV**.
*   **Step 2**: Click **Download CSV Template** and verify that a template download triggers containing standard headers.
*   **Step 3**: Drag and drop a modified CSV with some deliberate header errors (e.g., non-existent categories). Verify that the validator highlights rows with validation errors and disables the **Import** confirmation button.
*   **Step 4**: Correct the file and upload again. Verify that the progress bar fills as tasks are imported serially with a delay.
*   **Step 5**: Go to the **Dashboard** and click **Export Contributions CSV**. Verify that a CSV file downloads containing leaderboard rankings and point totals.

### 5. Verification of Version History Control (Tier 2c)
*   **Step 1**: In the **Files** browser, right-click any HTML document and select **View History**.
*   **Step 2**: In the modal, verify that the commit list is retrieved. Click **Preview** on an older commit. A read-only preview showing that revision's content should open.
*   **Step 3**: Click **Restore** on an older commit and confirm. Verify that a restoration commit is pushed, and the file content rolls back to the previous state.

### 6. Verification of Division Join Requests (Tier 3a)
*   **Step 1**: Create a new user account. On signup, select a division.
*   **Step 2**: Verify that the account does not get direct entry, but is instead greeted with a message: `Request sent! Waiting for admin approval`.
*   **Step 3**: Log in as an administrator on another session. Go to the **Team** tab.
*   **Step 4**: Verify that the **Pending Division Join Requests** section displays the user request. Click **Approve**.
*   **Step 5**: Check the user's session. They should now have full dashboard access under the approved division.
