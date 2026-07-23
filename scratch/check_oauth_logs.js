const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHZybGtpem9yc2N2ZWh0dHpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2MzA3MiwiZXhwIjoyMDkyODM5MDcyfQ.1fW24fXFAZx98dtLelrWmw8ROvkRcap8ObsMkWpy-6E";

async function checkLogs() {
  console.log('--- Checking Recent oauth_codes ---');
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes?order=created_at.desc&limit=5`, {
    headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
  });
  console.log('oauth_codes status:', r1.status, await r1.json());

  console.log('\n--- Checking Recent oauth_tokens ---');
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/oauth_tokens?order=created_at.desc&limit=5`, {
    headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
  });
  console.log('oauth_tokens status:', r2.status, await r2.json());

  console.log('\n--- Checking Recent admin_action_logs ---');
  const r3 = await fetch(`${SUPABASE_URL}/rest/v1/admin_action_logs?order=time.desc&limit=10`, {
    headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
  });
  console.log('admin_action_logs status:', r3.status, await r3.json());
}

checkLogs().catch(console.error);
