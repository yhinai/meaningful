import { redirect } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ match?: string }>;
}) {
  const [{ eventId }, { match }] = await Promise.all([params, searchParams]);
  redirect(
    `/event/${encodeURIComponent(eventId)}/network${match ? `?match=${encodeURIComponent(match)}` : ""}`,
  );
}
