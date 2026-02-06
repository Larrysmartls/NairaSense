import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocyledyrtfrodcnkcssj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeWxlZHlydGZyb2Rjbmtjc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzMwNTQsImV4cCI6MjA4NTkwOTA1NH0.VD9jV6LHrj3KD27TZCANDfR-ikGbAAakllYd6dZzhy0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);