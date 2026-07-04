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

  const { action, task_id, issue_type, question_index, description, issue_id } = req.body;

  try {
    if (action === 'report_issue') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/review_issues`, {
        method: 'POST',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id,
          reviewer_id: userId,
          issue_type,
          question_index,
          description,
          status: 'open'
        })
      });
      if (!resData.ok) throw new Error(await resData.text());
      return res.status(200).json({ success: true });
    }

    if (action === 'get_issues') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/review_issues?task_id=eq.${task_id}&order=created_at.desc`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      const data = await resData.json();
      return res.status(200).json({ success: true, issues: data });
    }

    if (action === 'resolve_issue') {
      const resData = await fetch(`${supabaseUrl}/rest/v1/review_issues?id=eq.${issue_id}`, {
        method: 'PATCH',
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'fixed', resolved_at: new Date().toISOString() })
      });
      if (!resData.ok) throw new Error(await resData.text());
      return res.status(200).json({ success: true });
    }

    // Parsing HTML requires some regex or DOM parsing.
    // In serverless, we can use simple regex to extract CBT parts if they follow a pattern,
    // but the actual parsing and updating might be easier on the client side in admin.js
    // to avoid complex DOM parsers in this lightweight function.
    // So `review-tools.js` mainly handles the issues DB operations.

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
