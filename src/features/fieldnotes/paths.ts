export const fieldnotesPath = (eventId: string, meetingId: string) =>
  `/event/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}/fieldnotes`;
