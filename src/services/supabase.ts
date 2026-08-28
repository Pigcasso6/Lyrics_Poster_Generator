import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lwwfxjiixaltbedvassi.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2Z4amlpeGFsdGJlZHZhc3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDIzNDIsImV4cCI6MjA4MDU3ODM0Mn0.zOfwiQ_AmUT_NuK7rXF2t7mgaO-QluU39i_KQMLw3qw';

export const supabase = createClient(supabaseUrl, supabaseKey);
