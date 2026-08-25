import { NextResponse } from 'next/server';
import { getDemoIdentity, setDemoRole } from '../../../lib/server/demo-auth';
import type { Role } from '../../../lib/domain/models';
const ROLES=new Set<Role>(['patient','staff','clinician','admin']);
export async function GET(){ return NextResponse.json({identity:await getDemoIdentity()}); }
export async function POST(request:Request){ const body=await request.json().catch(()=>null) as {role?:Role}|null; if(!body?.role||!ROLES.has(body.role))return NextResponse.json({error:'Invalid role'}, {status:400}); return NextResponse.json({identity:await setDemoRole(body.role)}); }
