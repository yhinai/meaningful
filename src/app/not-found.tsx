import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
export default function NotFound() {
  return (
    <section className="panel empty-state">
      <Sparkles size={35} />
      <h2>A little off the beaten path.</h2>
      <p>This page isn’t here. Your next meaningful connection could be.</p>
      <Link href="/" className="btn btn-primary">
        Back to your space <ArrowRight size={14} />
      </Link>
    </section>
  );
}
