import { Check, Sparkles } from "lucide-react";

export function PhotoHero() {
  return (
    <div className="pres-photo-hero">
      <div className="pres-photo-frame">
        <img
          src="/presentation/meaningful-conversation.jpg"
          alt="AI-generated editorial photo of two fictional founders connecting over coffee"
          fetchPriority="high"
        />
        <div className="pres-photo-shade" />
        <div className="pres-photo-topline">
          <span>THE BEGINNING OF SOMETHING.</span>
          <span>↗</span>
        </div>
        <div className="pres-photo-quote">
          The right people.
          <br />
          <em>A world of possibility.</em>
        </div>
        <span className="pres-photo-credit">AI-GENERATED EDITORIAL IMAGE</span>
      </div>
      <div className="pres-photo-match">
        <span className="pres-photo-match-icon">
          <Sparkles size={19} strokeWidth={1.3} />
        </span>
        <div>
          <small>YOUR TWIN FOUND COMMON GROUND</small>
          <strong>Different skills. Shared ambition.</strong>
          <span>Product perspective meets engineering expertise.</span>
        </div>
        <span className="pres-photo-check">
          <Check size={13} />
        </span>
      </div>
      <div className="pres-photo-twin">
        <span className="pres-photo-pulse" />
        <span>Your intention. Amplified.</span>
        <span>✳</span>
      </div>
    </div>
  );
}
