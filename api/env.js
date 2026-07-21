export default function handler(req, res) {
  // Hanya return anon key dan url, BUKAN service role key.
  // Walaupun ini tetap bisa dilihat di Network tab browser (karena Supabase JS membutuhkannya),
  // ini mencegah key di-hardcode di file statis (GitHub).
  res.status(200).json({
    url: process.env.SUPABASE_URL || 'https://hdhvrlkizorscvehttzd.supabase.co',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHZybGtpem9yc2N2ZWh0dHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjMwNzIsImV4cCI6MjA5MjgzOTA3Mn0.m6L3oEVAfyp2TjYmBCfDRo_30rdsWLEsGVZzRZIy3MU'
  });
}
