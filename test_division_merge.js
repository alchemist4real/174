import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) envVars[match[1]] = match[2];
});

const sbKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';

async function runTest() {
  const userId = '013b19f4-2b40-49be-9253-b7254cd5dd2f'; // using the test user
  console.log(`Using test user: ${userId}`);

  // 1. Simulate the new Onboarding API Call to 'review'
  console.log('\n--- Step 1: Join "review" division ---');
  let res = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  res = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
    method: 'POST',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, division_id: 'review', whatsapp: '123' })
  });
  
  if (!res.ok) console.error('Failed', await res.text());
  else console.log('Success');

  // 2. Simulate Onboarding API Call to 'management'
  console.log('\n--- Step 2: Join "management" division ---');
  let res2 = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  res2 = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
    method: 'POST',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, division_id: 'management', whatsapp: '456' })
  });

  if (!res2.ok) console.error('Failed', await res2.text());
  else console.log('Success');

  // 3. Verify Database State
  const verifyRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  const verifyData = await verifyRes.json();
  console.log('\nVerified Database State (Should only have 1 row):');
  console.log(verifyData);
}

runTest();
