import type { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '../domain/models';
import { getSupabaseDemoPassword } from '../supabase/env';
import { createServerSupabaseClient } from '../supabase/server';

export type AuthProfile = {
  id: string;
  clinicId: string;
  patientId: string | null;
  name: string;
  role: Role;
};

export type AuthContext = {
  supabase: SupabaseClient;
  profile: AuthProfile;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const DEMO_EMAILS: Record<Role, string> = {
  patient: process.env.SUPABASE_DEMO_PATIENT_EMAIL || 'patient@nightingale.demo',
  staff: process.env.SUPABASE_DEMO_STAFF_EMAIL || 'staff@nightingale.demo',
  clinician:
    process.env.SUPABASE_DEMO_CLINICIAN_EMAIL || 'clinician@nightingale.demo',
  admin: process.env.SUPABASE_DEMO_ADMIN_EMAIL || 'admin@nightingale.demo',
};

async function loadProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, clinic_id, patient_id, full_name, role')
    .eq('id', userId)
    .single();

  if (error || !data) throw new ApiError(403, 'Authenticated profile not permitted');
  return {
    id: data.id as string,
    clinicId: data.clinic_id as string,
    patientId: (data.patient_id as string | null) ?? null,
    name: data.full_name as string,
    role: data.role as Role,
  } satisfies AuthProfile;
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== 'string') throw new ApiError(401, 'Authentication required');
  return { supabase, profile: await loadProfile(supabase, userId) };
}

export async function signInAsDemoRole(role: Role): Promise<AuthProfile> {
  const email = DEMO_EMAILS[role];
  if (!email) throw new ApiError(400, 'Unsupported demo role');

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: getSupabaseDemoPassword(),
  });
  if (error || !data.user) throw new ApiError(503, 'Demo identity is not provisioned');
  return loadProfile(supabase, data.user.id);
}

export function publicIdentity(profile: AuthProfile) {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    clinicId: profile.clinicId,
    patientId: profile.patientId,
  };
}
