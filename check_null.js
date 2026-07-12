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

async function checkNull() {
  const userId = '013b19f4-2b40-49be-9253-b7254cd5dd2f'; // using the test user we found
  console.log('Testing insert with whatsapp: null...');
  const postRes = await fetch(`${supabaseUrl}/rest/v1/division_members`, {
    method: 'POST',
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, division_id: 'management', whatsapp: null })
  });
  
  if (!postRes.ok) {
    console.error('Failed!', await postRes.text());
  } else {
    console.log('Success! It allows null.');
  }
}

checkNull();
