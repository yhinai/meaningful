import type { RendezvousView } from "../types";
import type { VenueConfig } from "../venue/venue-types";

export class FindTwinApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function meetingApi(eventId: string, meetingId: string) {
  return `/api/events/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new FindTwinApiError(
      result?.error || "We couldn’t update your meeting. Please try again.",
      response.status,
    );
  return result as T;
}

export const findTwinApi = {
  get: (eventId: string, meetingId: string) =>
    request<RendezvousView>(`${meetingApi(eventId, meetingId)}/rendezvous`),
  venue: (eventId: string) =>
    request<VenueConfig>(`/api/events/${encodeURIComponent(eventId)}/venue`),
  mutate: (
    eventId: string,
    meetingId: string,
    path: string,
    method: string,
    body?: unknown,
  ) =>
    request<RendezvousView>(`${meetingApi(eventId, meetingId)}/${path}`, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  switchAccount: (userId: string) =>
    request<unknown>("/api/demo/action", {
      method: "POST",
      body: JSON.stringify({ action: "switch-user", userId }),
    }),
};
