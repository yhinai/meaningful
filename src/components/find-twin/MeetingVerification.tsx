import { Check, Circle } from "lucide-react";
import type { RendezvousView } from "@/features/find-twin/types";

export default function MeetingVerification({
  view,
}: {
  view: RendezvousView;
}) {
  if (!view.self.arrived && !view.verification.selfConfirmed) return null;
  return (
    <div className="ft-verification">
      <p>A meaningful hello takes two.</p>
      <div>
        <span className={view.verification.selfConfirmed ? "confirmed" : ""}>
          {view.verification.selfConfirmed ? (
            <Check size={13} />
          ) : (
            <Circle size={13} />
          )}
          You
        </span>
        <i />
        <span
          className={view.verification.counterpartConfirmed ? "confirmed" : ""}
        >
          {view.verification.counterpartConfirmed ? (
            <Check size={13} />
          ) : (
            <Circle size={13} />
          )}
          {view.counterpart.displayName.split(" ")[0]}
        </span>
      </div>
      <small>
        {view.verification.selfConfirmed
          ? "Your confirmation is saved. The other person confirms independently."
          : "Confirm only after you have met face to face."}
      </small>
    </div>
  );
}
