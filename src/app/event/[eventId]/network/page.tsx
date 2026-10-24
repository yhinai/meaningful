import ConnectionsHub from "@/components/connections/ConnectionsHub";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ match?: string }>;
}) {
  const [{ eventId }, { match }] = await Promise.all([params, searchParams]);
  return <ConnectionsHub eventId={eventId} initialMatchId={match} />;
}
