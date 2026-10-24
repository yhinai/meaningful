"use client";

import type { ReactNode } from "react";
import { motion, useDragControls } from "motion/react";

export default function RendezvousBottomSheet({
  children,
  expanded,
  onExpandedChange,
}: {
  children: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const controls = useDragControls();
  return (
    <motion.aside
      layout
      className={`ft-meeting-sheet ${expanded ? "expanded" : ""}`}
      transition={{ layout: { type: "spring", stiffness: 260, damping: 30 } }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.06}
      onDragEnd={(_, info) => {
        if (info.offset.y < -28) onExpandedChange(true);
        if (info.offset.y > 28) onExpandedChange(false);
      }}
    >
      <button
        className="ft-sheet-handle"
        aria-label={
          expanded ? "Collapse meeting details" : "Expand meeting details"
        }
        aria-expanded={expanded}
        onPointerDown={(e) => controls.start(e)}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span />
      </button>
      {children}
    </motion.aside>
  );
}
