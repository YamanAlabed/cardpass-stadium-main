import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL');
}
if (!anon) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, anon);
