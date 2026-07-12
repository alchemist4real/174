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

async function checkSchema() {
  console.log('Fetching division_members...');
  const res = await fetch(`${supabaseUrl}/rest/v1/division_members?select=*`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  const data = await res.json();
  console.log(`Total rows: ${data.length}`);
  
  // Find users with multiple rows
  const userCounts = {};
  data.forEach(row => {
    userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1;
  });
  
  for (const [userId, count] of Object.entries(userCounts)) {
    if (count > 1) {
      console.log(`User ${userId} has ${count} divisions.`);
    }
  }
}

checkSchema();
