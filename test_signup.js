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

// using Anon key usually for signup, but let's just see if we can do it with the service key or if it returns session.
// Wait, the client uses Anon key for normal signup. I'll need to grab the anon key from somewhere.
// Let's grab it from index.html
const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
const match = indexHtml.match(/const supabaseKey = '([^']+)';/);
const anonKey = match[1];

const supabase = createClient(supabaseUrl, anonKey);

async function testSignup() {
  const email = `guest_${Date.now()}@mrcapsules.com`;
  console.log("Testing Signup with:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'GuestPassword123!',
  });
  if (error) {
    console.error("Signup failed:", error.message);
  } else {
    console.log("Signup succeeded!", data.session ? "Got Session (No confirm needed)" : "No Session (Confirm needed)");
  }
}
testSignup();
