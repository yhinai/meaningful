export const fieldnotesPath = (eventId: string, meetingId: string) =>
  `/event/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}/fieldnotes`;
export const fieldnotesMagazinePath = (eventId: string, meetingId: string) =>
  `${fieldnotesPath(eventId, meetingId)}/magazine`;
