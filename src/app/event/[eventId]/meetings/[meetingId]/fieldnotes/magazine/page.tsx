import FieldnotesJournal from "@/components/fieldnotes/FieldnotesJournal";
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string; meetingId: string }>;
}) {
  const { eventId, meetingId } = await params;
  return <FieldnotesJournal eventId={eventId} meetingId={meetingId} magazine />;
}
