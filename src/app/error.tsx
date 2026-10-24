"use client";
import { RefreshCw } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="panel empty-state">
      <RefreshCw size={35} />
      <h2>Let’s reconnect.</h2>
      <p>
        Something interrupted your experience. Your saved connections are still
        here.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again <RefreshCw size={14} />
      </button>
    </section>
  );
}
