// config.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abcdefgh.supabase.co';  // ← Paste your URL here
const supabaseKey = 'eyJhbGc...your-long-key-here';  // ← Paste your key here

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;