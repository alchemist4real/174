// api/env.js
// Handles public system environment and configuration endpoints

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const host = req.headers.host || 'mr-capsules.vercel.app';
  const urlObj = new URL(req.url, `https://${host}`);
  const isConfigReq = urlObj.pathname.includes('/config') || urlObj.searchParams.get('type') === 'config';

  const supabaseUrl = process.env.SUPABASE_URL || 'https://hdhvrlkizorscvehttzd.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHZybGtpem9yc2N2ZWh0dHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjMwNzIsImV4cCI6MjA5MjgzOTA3Mn0.m6L3oEVAfyp2TjYmBCfDRo_30rdsWLEsGVZzRZIy3MU';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  if (isConfigReq) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/app_settings?limit=1`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return res.status(200).json({
            allowSignup: data[0].allow_signup ?? true,
            allowGuest: data[0].allow_guest ?? true,
            maintenanceMode: data[0].maintenance_mode ?? false,
            bannedDevices: data[0].banned_devices || []
          });
        }
      }
    } catch (e) {}

    return res.status(200).json({
      allowSignup: true,
      allowGuest: true,
      maintenanceMode: false,
      bannedDevices: []
    });
  }

  // Default: Return public Supabase url & anon key
  return res.status(200).json({
    url: supabaseUrl,
    key: anonKey
  });
}
