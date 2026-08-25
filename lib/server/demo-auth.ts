import { cookies } from 'next/headers';
import type { DemoIdentity, Role } from '../domain/models';

export const DEMO_IDENTITIES: Record<string, DemoIdentity> = {
  clinician_a:{id:'clinician_a',name:'Dr Marcus Lim',role:'clinician',clinicId:'clinic-a'},
  staff_a:{id:'staff_a',name:'Nurse Alice Wong',role:'staff',clinicId:'clinic-a'},
  patient_sarah:{id:'patient_sarah',name:'Sarah Tan',role:'patient',clinicId:'clinic-a',patientId:'sarah-tan'},
  admin_a:{id:'admin_a',name:'Clinic Admin',role:'admin',clinicId:'clinic-a'},
  clinician_b:{id:'clinician_b',name:'Dr Priya Nair',role:'clinician',clinicId:'clinic-b'},
};
const ROLE_TO_ID: Record<Role,string>={clinician:'clinician_a',staff:'staff_a',patient:'patient_sarah',admin:'admin_a'};
export async function getDemoIdentity() { const jar=await cookies(); return DEMO_IDENTITIES[jar.get('nightingale_demo_identity')?.value||'clinician_a']||DEMO_IDENTITIES.clinician_a; }
export async function setDemoRole(role:Role){ const jar=await cookies(); const id=ROLE_TO_ID[role]; if(!id)throw new Error('Invalid role'); jar.set('nightingale_demo_identity',id,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*8}); return DEMO_IDENTITIES[id]; }
