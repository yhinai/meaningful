import { NextRequest, NextResponse } from "next/server";
import { attendees } from "@/lib/fixtures";
import { falkorDBConfigured, getMatchGraphEvidence } from "@/features/falkordb/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const cache=new Map<string,{until:number;value:Awaited<ReturnType<typeof getMatchGraphEvidence>>}>();
export async function GET(request:NextRequest) {
  const headers={"Cache-Control":"no-store"};
  if(!falkorDBConfigured())return NextResponse.json({configured:false},{headers});
  const candidateId=request.nextUrl.searchParams.get("candidateId");
  if(!candidateId)return NextResponse.json({configured:true,graph:"conference",dataset:"synthetic_conference"},{headers});
  const viewerId=request.cookies.get("demo_user")?.value || "usr_self";
  const known=(id:string)=>id==="usr_self" || attendees.some(person=>person.id===id && person.optIn);
  if(!known(viewerId) || !known(candidateId) || viewerId===candidateId)
    return NextResponse.json({error:"Choose another opted-in conference attendee."},{status:403,headers});
  const key=`${viewerId}:${candidateId}`;
  try {
    const prior=cache.get(key);
    const evidence=prior && prior.until>Date.now() ? prior.value : await getMatchGraphEvidence(viewerId,candidateId);
    if(cache.size>=100)cache.delete(cache.keys().next().value!);
    cache.set(key,{value:evidence,until:prior?.value===evidence ? prior.until : Date.now()+60000});
    return NextResponse.json({configured:true,...evidence},{headers});
  } catch {
    return NextResponse.json({configured:true,error:"The live graph is unavailable. Your connection and local match details are still saved."},{status:503,headers});
  }
}
