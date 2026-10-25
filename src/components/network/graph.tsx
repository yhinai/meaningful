"use client";
import { memo, useMemo, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ReactFlow,
  BaseEdge,
  getStraightPath,
  type EdgeProps,
  Background,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  BackgroundVariant,
  Controls,
  useStore,
  useReactFlow,
  useNodesInitialized,
} from "@xyflow/react";
import { Sparkles, Check, MessageCircle, X } from "lucide-react";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import "@xyflow/react/dist/style.css";
import "./network.css";
import "./graph.css";
import { type GraphPerson, previewPeople } from "./people";
import { orbitalPosition } from "./orbital-layout";
import "./cohort-graph.css";
type PersonNodeData = {
  person: GraphPerson;
  self?: boolean;
  status?: string;
  selected?: boolean;
  chosen?: boolean;
  compact?: boolean;
  conference?: boolean;
  twinMood?: "idle" | "working" | "happy";
  index?: number;
};
type PersonNodeType = Node<PersonNodeData, "person">;
const PersonNode = memo(function PersonNode({
  data,
}: NodeProps<PersonNodeType>) {
  const zoom = useStore((state) => state.transform[2]);
  const {
    person,
    self,
    status,
    selected,
    chosen,
    compact,
    conference,
    twinMood,
    index = 0,
  } = data;
  return (
    <div
      data-overview={false}
      data-chosen={chosen}
      data-hide-metadata={conference}
      style={
        conference
          ? ({
              animationDelay: `${index * 0.16}s`,
              "--graph-label-size": `${12 / zoom}px`,
              "--graph-photo-size": `${Math.max(80, 34 / zoom)}px`,
              "--graph-twin-size": `${Math.max(44, 23 / zoom)}px`,
              "--graph-self-size": `${Math.max(120, 64 / zoom)}px`,
              "--graph-label-width": `${84 / zoom}px`,
              "--graph-meta-size": `${11 / zoom}px`,
              "--graph-check-size": `${17 / zoom}px`,
              "--graph-check-icon": `${10 / zoom}px`,
              "--graph-check-border": `${2 / zoom}px`,
            } as CSSProperties)
          : undefined
      }
      className={`mm-person-node ${self ? "mm-self-node" : ""} ${selected ? "is-selected" : ""} ${status === "negotiating" ? "is-talking" : ""} ${status === "accepted" ? "is-accepted" : ""} ${status === "rejected" ? "is-rejected" : ""} ${compact ? "is-compact" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, top: conference ? 60 : 34, left: "50%" }}
      />
      <div className="mm-avatar-ring">
        <div className="mm-graph-avatar">
          {self ? (
            conference ? (
              <TwinCharacter
                size={96}
                personId={person.id}
                mood={twinMood || "idle"}
                interactive={false}
              />
            ) : (
              <Sparkles size={compact ? 27 : 32} strokeWidth={1.25} />
            )
          ) : (
            <>
              <span>
                {person.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </span>
              {person.avatar && (
                <img
                  src={person.avatar}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </>
          )}
        </div>
        {!self && (
          <span className="mm-attendee-twin">
            <TwinCharacter size={32} personId={person.id} />
          </span>
        )}
        {status === "completed" ? (
          <span className="mm-node-badge accepted" title="Meeting completed">
            <Check size={10} />
          </span>
        ) : status === "accepted" ? (
          <span className="mm-node-badge accepted" title="Meeting accepted">
            <Check size={10} />
          </span>
        ) : status === "rejected" ? (
          <span className="mm-node-badge rejected" title="Not a fit">
            <X size={10} />
          </span>
        ) : chosen ? (
          <span className="mm-node-badge" title="You chose this connection" aria-label="You chose this connection">
            <Check size={10} />
          </span>
        ) : status === "negotiating" ? (
          <span className="mm-node-badge talking">
            <MessageCircle size={10} />
          </span>
        ) : null}
      </div>
      <strong>{self ? "Your twin" : person.name.split(" ")[0]}</strong>
      <span className="mm-node-role">
        {self
          ? conference
            ? twinMood === "working"
              ? "Making connections"
              : twinMood === "happy"
                ? "Your conference companion"
                : "Ready when you are"
            : "Making connections"
          : status === "completed"
            ? "You met"
            : status === "accepted"
              ? "Meeting accepted"
              : status === "negotiating"
                ? "Twins talking"
                : status === "qualified"
                  ? "Meaningful fit"
                  : status === "rejected"
                    ? "Not a fit"
                    : person.role}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          opacity: 0,
          top: conference ? 60 : 34,
          bottom: "auto",
          left: "50%",
        }}
      />
    </div>
  );

}, (previous, next) => {
  const before = previous.data;
  const after = next.data;
  return before.person.id === after.person.id &&
    before.person.name === after.person.name && before.person.avatar === after.person.avatar &&
    before.self === after.self && before.status === after.status &&
    before.selected === after.selected && before.chosen === after.chosen && before.compact === after.compact &&
    before.conference === after.conference && before.twinMood === after.twinMood &&
    before.index === after.index;
});
const nodeTypes = { person: PersonNode };
function ConferenceEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd }: EdgeProps) {
  const zoom = useStore((state) => state.transform[2]);
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const chosen = style?.stroke === "#268653";
  return <BaseEdge id={id} path={path} markerEnd={markerEnd}
    style={{ ...style, strokeWidth: (chosen ? 1.5 : .45) / zoom }} />;
}
const edgeTypes = { conference: ConferenceEdge };

function FitCircle({ count, filter }: { count: number; filter: string }) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();
  const viewportReady = useStore((state) => state.panZoom !== null);
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  useEffect(() => {
    if (!ready || !viewportReady || width <= 0 || height <= 0) return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: .12, minZoom: .16, maxZoom: 1, duration: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [count, filter, fitView, ready, viewportReady, width, height]);
  return null;
}

export interface OrbitalGraphProps {
  people?: GraphPerson[];
  selfPersonId?: string;
  selectedId?: string;
  onSelect?: (person: GraphPerson) => void;
  activeIds?: string[];
  qualifiedIds?: string[];
  chosenIds?: string[];
  acceptedIds?: string[];
  completedIds?: string[];
  onTwinSelect?: () => void;
  conferenceMode?: boolean;
  twinMood?: "idle" | "working" | "happy";
  rejectedIds?: string[];
  compact?: boolean;
  filter?: string;
}
export default function OrbitalGraph({
  people = previewPeople,
  selfPersonId = "usr_self",
  selectedId,
  onSelect,
  activeIds = [],
  qualifiedIds = [],
  chosenIds,
  acceptedIds = [],
  completedIds = [],
  onTwinSelect,
  conferenceMode = false,
  twinMood = "idle",
  rejectedIds = [],
  compact = false,
  filter = "All",
}: OrbitalGraphProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element || !conferenceMode) return;
    const observer = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 440);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [conferenceMode]);
  const { nodes, edges } = useMemo(() => {
    const chosen = new Set(chosenIds ?? [...acceptedIds, ...completedIds]);
    const self: PersonNodeType = {
      id: "self",
      type: "person",
      position: { x: 0, y: 0 },
      data: {
        self: true,
        person: {
          id: selfPersonId,
          name: "Your twin",
          role: "",
          company: "",
          topics: [],
        },
        compact,
        conference: conferenceMode,
        twinMood,
      },
      draggable: false,
      ariaLabel: "Your twin. Open your conference companion.",
      ariaRole: conferenceMode ? "button" : undefined,
    };
    const persons = people;
    const graphNodes: PersonNodeType[] = persons.map((p, i) => {
      const inner = i < 10;
      const angle = ((inner ? i : i - 10) / (inner ? 10 : 20)) * Math.PI * 2
        - Math.PI / 2 + (inner ? 0 : Math.PI / 20);
      const radius = inner ? 300 : 600;
      const position = conferenceMode
        ? { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * (narrow ? 1.25 : .84)) }
        : orbitalPosition(i);
      const status = completedIds.includes(p.id)
        ? "completed"
        : acceptedIds.includes(p.id)
          ? "accepted"
          : rejectedIds.includes(p.id)
            ? "rejected"
            : activeIds.includes(p.id)
              ? "negotiating"
              : qualifiedIds.includes(p.id)
                ? "qualified"
                : "candidate";
      const hidden =
        (filter === "Talking" && !activeIds.includes(p.id)) ||
        (filter === "Matches" &&
          !qualifiedIds.includes(p.id) &&
          !acceptedIds.includes(p.id) &&
          !completedIds.includes(p.id));
      return {
        id: p.id,
        type: "person",
        position,
        data: {
          person: p,
          status,
          chosen: chosen.has(p.id),
          selected: selectedId === p.id,
          compact,
          conference: conferenceMode,
          index: i + 1,
        },
        draggable: false,
        ariaLabel: `${p.name}, ${p.role}. Open profile.`,
        ariaRole: conferenceMode ? "button" : undefined,
        hidden,
      };
    });
    const graphEdges: Edge[] = persons.map((p, i) => ({
      id: `self-${p.id}`,
      source: "self",
      target: p.id,
      type: conferenceMode ? "conference" : "straight",
      animated: activeIds.includes(p.id),
      className: conferenceMode
        ? `conference-arriving-edge ${chosen.has(p.id) ? "conference-chosen-edge" : ""}`
        : undefined,
      style: {
        ...(conferenceMode ? { animationDelay: `${(i + 1) * 0.16}s` } : {}),
        stroke: chosen.has(p.id) ? "#268653" : activeIds.includes(p.id) ? "#7f8791" : "#e3e3e8",
        strokeWidth: acceptedIds.includes(p.id)
          ? 2.5
          : activeIds.includes(p.id)
            ? 1.7
            : 0.8,
        opacity: chosen.has(p.id) ? .9 : .35,
      },
      hidden: graphNodes[i].hidden,
    }));
    return { nodes: [self, ...graphNodes], edges: graphEdges };
  }, [
    people,
    narrow,
    selfPersonId,
    selectedId,
    activeIds,
    qualifiedIds,
    chosenIds,
    acceptedIds,
    completedIds,
    rejectedIds,
    conferenceMode,
    twinMood,
    compact,
    filter,
  ]);
  return (
    <div
      ref={canvasRef}
      className={`mm-orbital-graph ${compact ? "compact" : ""} ${conferenceMode ? "conference-mode" : ""}`}
      onKeyDown={(event) => {
        if (!conferenceMode || (event.key !== "Enter" && event.key !== " "))
          return;
        const id = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node[data-id]",
        )?.dataset.id;
        if (!id) return;
        event.preventDefault();
        if (id === "self") onTwinSelect?.();
        else {
          const person = people.find((person) => person.id === id);
          if (person) onSelect?.(person);
        }
      }}
    >
      <div className="mm-orbits">
        <i />
        <i />
        <i />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: compact ? 0.1 : 0.12 }}
        minZoom={0.16}
        maxZoom={1.8}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag={!compact}
        zoomOnScroll={!conferenceMode && !compact}
        zoomActivationKeyCode={conferenceMode ? ["Meta", "Control"] : null}
        preventScrolling={false}
        zoomOnPinch={!compact}
        zoomOnDoubleClick={!compact}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={!compact}
        onNodeClick={(_, node) => {
          if (node.id === "self") onTwinSelect?.();
          else onSelect?.(node.data.person as GraphPerson);
        }}
      >
        <FitCircle count={nodes.length} filter={`${filter}-${narrow}`} />
        {!compact && (
          <Controls showInteractive={false} position="bottom-left" />
        )}
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={0.7}
          color="#e4e4e8"
        />
      </ReactFlow>
    </div>
  );
}
