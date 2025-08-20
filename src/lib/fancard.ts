import { supabase } from './supabaseClient';

export interface GeneratedCode {
    id: string;
    code: string;
    created_at: string;
    is_registered: boolean;
    registered_at?: string | null;
    fan_name?: string | null;
    fan_email?: string | null;
}

export async function fetchCodes(): Promise<GeneratedCode[]> {
    const { data, error } = await supabase
        .from('codes')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data as GeneratedCode[];
}

export async function createCodes(batch: number): Promise<GeneratedCode[]> {
    const rows = Array.from({ length: batch }).map(() => {
        const code = `FC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        return {
            code,
            is_registered: false
        };
    });
    const { data, error } = await supabase
        .from('codes')
        .insert(rows)
        .select('*');
    if (error) throw error;
    return data as GeneratedCode[];
}

export async function deleteCodeById(id: string) {
    const { error } = await supabase.from('codes').delete().eq('id', id);
    if (error) throw error;
}

export async function deletePendingCodes() {
    const { error } = await supabase.from('codes').delete().eq('is_registered', false);
    if (error) throw error;
}

export async function deleteAllCodes() {
    // Löscht faktisch alle Zeilen
    const { error } = await supabase.from('codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
}

export async function registerCode(code: string, fanName: string, fanEmail?: string) {
    const { data, error } = await supabase
        .from('codes')
        .update({
            is_registered: true,
            registered_at: new Date().toISOString(),
            fan_name: fanName,
            fan_email: fanEmail || null
        })
        .eq('code', code)
        .select('*')
        .single();
    if (error) throw error;
    return data as GeneratedCode;
}

export type ScanStatus = 'registered' | 'unregistered' | 'invalid';

export async function logScan(code: string, status: ScanStatus, fanName?: string) {
    const { error } = await supabase.from('scan_history').insert({
        code,
        status,
        fan_name: fanName || null
    });
    if (error) throw error;
}

export async function fetchScanHistory(limit = 200) {
    const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}
