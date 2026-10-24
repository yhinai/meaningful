import FindTwinScreen from "@/components/find-twin/FindTwinScreen";

export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string; meetingId: string }>;
}) {
  const { eventId, meetingId } = await params;
  return <FindTwinScreen eventId={eventId} meetingId={meetingId} />;
}
