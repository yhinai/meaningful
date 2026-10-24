import Link from "next/link";
import { Navigation } from "lucide-react";

type Props = { eventId: string; meetingId: string; status: string };

export function FindTwinEntry({ eventId, meetingId, status }: Props) {
  if (status !== "accepted") return null;
  return (
    <Link
      className="btn btn-primary"
      href={`/event/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}/find`}
    >
      <Navigation size={14} strokeWidth={1.6} /> Find Twin
    </Link>
  );
}
