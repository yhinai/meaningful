import { Check, Clock3 } from "lucide-react";

export default function ArrivalConfirmation({
  selfArrived,
  counterpartArrived,
  name,
}: {
  selfArrived: boolean;
  counterpartArrived: boolean;
  name: string;
}) {
  if (!selfArrived) return null;
  return (
    <div className="ft-arrival-status">
      <span className="ft-arrival-icon">
        <Check size={16} />
      </span>
      <div>
        <strong>You’re here.</strong>
        <p>
          {counterpartArrived
            ? `${name} is here too. Say hello.`
            : `Waiting for ${name}. A good hello is worth it.`}
        </p>
      </div>
      {!counterpartArrived && <Clock3 size={16} strokeWidth={1.4} />}
    </div>
  );
}
