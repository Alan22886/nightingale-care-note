import { NextResponse } from 'next/server'; import { getDemoIdentity } from '../../../lib/server/demo-auth'; import { store } from '../../../lib/server/demo-store';
export async function GET(){ const identity=await getDemoIdentity(); if(identity.role==='patient')return NextResponse.json({error:'Patient access denied'},{status:403}); return NextResponse.json({events:store.audit}); }
