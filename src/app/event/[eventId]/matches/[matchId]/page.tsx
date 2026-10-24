import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
}) {
  const { eventId, matchId } = await params;
  redirect(
    `/event/${encodeURIComponent(eventId)}/network?match=${encodeURIComponent(matchId)}`,
  );
}
