import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(supabaseUrl, sbKey);

async function testAnon() {
  console.log("Testing Anonymous Login...");
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Anonymous login failed:", error.message);
  } else {
    console.log("Anonymous login succeeded! User ID:", data.user?.id);
  }
}
testAnon();
