// scripts/generate-supabase-config.js
// Generates supabase.config.js with environment variables at build time
const fs = require('fs');

const cfg = `export const SUPABASE_CONFIG = {
  url: ${JSON.stringify(process.env.SUPABASE_URL || '')},
  anonKey: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')}
};`;

fs.writeFileSync('supabase.config.js', cfg);
