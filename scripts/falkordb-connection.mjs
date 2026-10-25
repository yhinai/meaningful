/** Connection options shared by the verifier and server-only app adapter. */
export async function connectionOptions() {
  const url = process.env.FALKORDB_URL;
  if (!url || new URL(url).protocol !== "falkors:") {
    throw Error("FALKORDB_URL must be a TLS falkors:// connection URL.");
  }
  const socket = {
    connectTimeout: 5000,
    reconnectStrategy: /** @type {false} */ (false),
  };
  if (process.env.FALKORDB_DNS_MODE !== "google-doh") return { url, socket };
  // Explicit opt-in for environments with stale DNS. Only the hostname is sent;
  // credentials remain in the TLS connection to the original server name.
  const hostname = new URL(url).hostname;
  const response = await fetch(
    `https://dns.google/resolve?type=A&name=${encodeURIComponent(hostname)}`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw Error("DNS resolution failed.");
  const result = await response.json();
  const address = result.Answer?.find(
    /** @param {{type:number,data:string}} entry */ (entry) => entry.type === 1,
  )?.data;
  if (result.Status !== 0 || !address)
    throw Error("DNS returned no IPv4 address.");
  /** @type {import('node:net').LookupFunction} */
  const lookup = (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address, family: 4 }]);
    else callback(null, address, 4);
  };
  return { url, socket: { ...socket, lookup } };
}
