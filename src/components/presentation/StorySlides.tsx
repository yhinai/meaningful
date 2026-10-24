"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  Coffee,
  Fingerprint,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import "./story-slides.css";
import "./story-responsive.css";

function Heading({
  eyebrow,
  children,
  description,
}: {
  eyebrow: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="pres-story-heading">
      <span className="pres-story-eyebrow">{eyebrow}</span>
      <h2>{children}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="pres-phone" aria-label={label}>
      <div className="pres-phone-status">
        <span>9:41</span>
        <i />
        <span>▮▮▮ ▰</span>
      </div>
      <div className="pres-phone-content">{children}</div>
      <div className="pres-phone-home" />
    </div>
  );
}

export function ProblemSlide() {
  return (
    <section className="pres-story pres-problem-slide">
      <Heading eyebrow="02 / THE PROBLEM">
        Networking is still
        <br />
        <em>mostly luck.</em>
      </Heading>
      <div className="pres-problem-layout">
        <div className="pres-problem-crowd">
          <div className="pres-crowd-caption">
            <span>THE CONFERENCE PARADOX</span>
            <strong>
              So close.
              <br />
              Still strangers.
            </strong>
          </div>
          <img className="pres-conference-photo" src="/presentation/conference-crowd.jpg" alt="AI-generated editorial scene of a fictional attendee looking across a busy conference reception" />
          <span className="pres-crowd-foot">
            The right person could be ten feet away.
          </span>
        </div>
        <div className="pres-problem-points">
          {[
            {
              icon: MessageCircle,
              title: "Wrong conversations",
              text: "We meet whoever happens to be nearby.",
            },
            {
              icon: Users,
              title: "Hidden opportunities",
              text: "An attendee list can’t tell you who shares your goals.",
            },
            {
              icon: Fingerprint,
              title: "Forgotten follow-ups",
              text: "Names, ideas, and next steps get left behind.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div className="pres-problem-point" key={title}>
              <span className="pres-point-icon">
                <Icon size={20} strokeWidth={1.4} />
              </span>
              <div>
                <span className="pres-small-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="pres-story-bottom">
        Conferences optimize for attendance.{" "}
        <strong>We optimize for meaningful outcomes.</strong>
      </p>
    </section>
  );
}

export function TrainSlide() {
  const [step, setStep] = useState(0);
  return (
    <section className="pres-story pres-train-slide">
      <div className="pres-story-copy">
        <Heading eyebrow="03 / YOUR PERSONAL AI">
          A twin that gets you.
          <br />
          <em>A goal that guides it.</em>
        </Heading>
        <p className="pres-story-lead">
          Tell your AI twin what you offer and who you need.
          <br />
          It scouts this conference on your behalf.
        </p>
        <div
          className="pres-training-tabs"
          role="group"
          aria-label="Twin setup steps"
        >
          <button
            id="pres-train-tab-0"
            aria-pressed={step === 0}
            aria-controls="pres-train-panel-0"
            className={step === 0 ? "pres-selected" : ""}
            onClick={() => setStep(0)}
          >
            <span>01</span>
            <div>
              <strong>Train your twin</strong>
              <small>Your skills, interests, and sharing boundaries.</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
          <button
            id="pres-train-tab-1"
            aria-pressed={step === 1}
            aria-controls="pres-train-panel-1"
            className={step === 1 ? "pres-selected" : ""}
            onClick={() => setStep(1)}
          >
            <span>02</span>
            <div>
              <strong>Set your conference goal</strong>
              <small>A specific mission for the people you want to meet.</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="pres-privacy-note">
          <ShieldCheck size={16} />
          <span>
            Your profile belongs to you.
            <br />
            Only approved information is shared.
          </span>
        </div>
      </div>
      <div className={`pres-twin-phones pres-step-${step}`}>
        <div
          id="pres-train-panel-0"
          aria-labelledby="pres-train-tab-0"
          className="pres-phone-profile"
        >
          <Phone label="Illustrative twin profile">
            <div className="pres-phone-nav">
              Your twin <Fingerprint size={18} />
            </div>
            <div className="pres-profile-orbit">
              <div className="pres-profile-avatar">AM</div>
              <span>
                <Sparkles size={12} />
              </span>
            </div>
            <h3>Alex Morgan</h3>
            <p className="pres-phone-role">AI product builder</p>
            <div className="pres-phone-chips">
              <span>AI agents</span>
              <span>Product</span>
              <span>Startups</span>
            </div>
            <div className="pres-phone-field">
              <small>I CAN HELP WITH</small>
              <p>Turning ambitious ideas into products people love.</p>
            </div>
            <div className="pres-phone-field">
              <small>I’M LOOKING FOR</small>
              <p>A technical cofounder who loves building with AI.</p>
            </div>
            <div className="pres-phone-toggle">
              <LockKeyhole size={13} />
              <span>Approved profile only</span>
              <b>
                <i />
              </b>
            </div>
            <span className="pres-phone-demo">ILLUSTRATIVE DEMO PROFILE</span>
          </Phone>
        </div>
        <div
          id="pres-train-panel-1"
          aria-labelledby="pres-train-tab-1"
          className="pres-phone-goal"
        >
          <Phone label="Illustrative goal interview">
            <div className="pres-phone-nav">
              A little intention <Sparkles size={17} />
            </div>
            <div className="pres-goal-label">PATCH THE CONFERENCE</div>
            <h3>
              What brings
              <br />
              <em>you here?</em>
            </h3>
            <div className="pres-chat-bubble pres-chat-twin">
              What do you want to achieve today?
            </div>
            <div className="pres-chat-bubble pres-chat-human">
              Meet a technical cofounder for an AI startup.
            </div>
            <div className="pres-chat-bubble pres-chat-twin">
              What skills matter most?
            </div>
            <div className="pres-chat-bubble pres-chat-human">
              Full-stack engineering and agent systems.
            </div>
            <a className="pres-phone-cta" href="/presentation?slide=4">
              Start scouting <ArrowUpRight size={14} />
            </a>
            <span className="pres-phone-demo">ILLUSTRATIVE DEMO</span>
          </Phone>
        </div>
        <div className="pres-phone-floating-note">
          <span className="pres-status-dot" /> Your intention. Amplified.
        </div>
      </div>
    </section>
  );
}

export function MeetSlide() {
  return (
    <section className="pres-story pres-meet-slide">
      <div className="pres-story-copy">
        <Heading eyebrow="05 / THE HUMAN MOMENT">
          From a good match.
          <br />
          <em>To a real handshake.</em>
        </Heading>
        <p className="pres-story-lead">
          Your twin proposes an introduction.
          <br />
          You both approve. Then choose where to meet.
        </p>
        <ol className="pres-meeting-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Both people say yes.</strong>
              <small>Every introduction begins with mutual approval.</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Find a shared spot.</strong>
              <small>An agreed meeting point. A voluntary check-in.</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Make it meaningful.</strong>
              <small>Mutual confirmation or QR. Then earn points.</small>
            </div>
          </li>
        </ol>
        <span className="pres-synthetic-label">
          Illustrative meeting · simulated rewards
        </span>
      </div>
      <div className="pres-meet-visual">
        <div className="pres-meet-aura" />
        <Phone label="Illustrative Find Twin meeting map">
          <div className="pres-phone-nav">
            Find your connection <ArrowUpRight size={16} />
          </div>
          <div className="pres-mini-match">
            <div className="pres-mini-avatar">JL</div>
            <div>
              <strong>Jordan Lee</strong>
              <span>Agent systems engineer</span>
            </div>
            <b>
              91<small>/100</small>
            </b>
          </div>
          <div className="pres-mutual-badge">
            <Check size={12} /> Both accepted · illustrative
          </div>
          <svg
            className="pres-meeting-map"
            viewBox="0 0 260 240"
            aria-label="Illustrative venue floor plan with Coffee Bar and Main Stage"
            role="img"
          >
            <rect width="260" height="240" rx="12" fill="#f2f3f5" />
            <path
              d="M0 70H260M0 177H260M81 0V240M192 0V240"
              stroke="#fff"
              strokeWidth="16"
            />
            <rect x="14" y="15" width="54" height="42" rx="5" fill="#e3e6eb" />
            <rect x="99" y="14" width="73" height="43" rx="5" fill="#e3e6eb" />
            <rect x="206" y="14" width="42" height="43" rx="5" fill="#e3e6eb" />
            <rect x="12" y="93" width="55" height="61" rx="5" fill="#e6e7eb" />
            <rect x="99" y="93" width="74" height="61" rx="5" fill="#dce5f3" />
            <text
              x="136"
              y="120"
              textAnchor="middle"
              fontSize="9"
              fill="#47556e"
            >
              COFFEE
            </text>
            <text
              x="136"
              y="132"
              textAnchor="middle"
              fontSize="9"
              fill="#47556e"
            >
              BAR
            </text>
            <rect x="205" y="94" width="43" height="60" rx="5" fill="#e6e7eb" />
            <rect
              x="13"
              y="197"
              width="162"
              height="29"
              rx="5"
              fill="#e3dfd7"
            />
            <text
              x="94"
              y="215"
              textAnchor="middle"
              fontSize="9"
              fill="#6c6a66"
            >
              MAIN STAGE
            </text>
            <path
              d="M54 176H82V77H137V92"
              stroke="#6787bc"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />
            <circle
              cx="54"
              cy="176"
              r="7"
              fill="#6686b9"
              stroke="white"
              strokeWidth="3"
            />
            <circle
              cx="137"
              cy="83"
              r="12"
              fill="#6d89b4"
              stroke="white"
              strokeWidth="3"
            />
            <path
              d="M133 83l3 3 5-6"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <div className="pres-meeting-location">
            <Coffee size={18} />
            <div>
              <strong>Meet at Coffee Bar</strong>
              <span>Agreed meeting point</span>
            </div>
            <Check size={14} />
          </div>
          <div className="pres-check-in">
            <ShieldCheck size={12} /> Voluntary check-in · shared for 15 minutes
          </div>
          <span className="pres-phone-demo">
            VENUE PLAN · NO PRECISE TRACKING
          </span>
        </Phone>
        <div className="pres-xp-card">
          <span className="pres-xp-symbol">
            <WandSparkles size={23} strokeWidth={1.2} />
          </span>
          <span>CONNECTION COMPLETE</span>
          <strong>
            +50 <em>XP</em>
          </strong>
          <small>After mutual meeting verification</small>
        </div>
        <div className="pres-perk-card">
          <div>
            <Sparkles size={16} />
            <strong>A little something extra.</strong>
          </div>
          <p>Demo sponsor perk unlocked</p>
          <small>Email preview only · simulated reward</small>
        </div>
      </div>
    </section>
  );
}

export function MagazineSlide() {
  return (
    <section className="pres-story pres-magazine-slide">
      <div className="pres-magazine-top">
        <Heading eyebrow="06 / A STORY WORTH KEEPING">
          The conference ends.
          <br />
          <em>The connections don’t.</em>
        </Heading>
        <p>
          With participant consent, OMI insights become
          <br />
          your personal magazine: people, ideas, and next steps.
          <span className="pres-synthetic-label">
            Illustrative magazine · integration prototype
          </span>
        </p>
      </div>
      <div className="pres-magazine-spread">
        <div className="pres-mag-page pres-mag-cover">
          <div className="pres-mag-masthead">
            <span>MEANINGFUL PEOPLE. LASTING IDEAS.</span>
            <span>VOL. 001</span>
          </div>
          <h3>
            My day at
            <br />
            <em>Patch the Conference.</em>
          </h3>
          <img
            className="pres-mag-art"
            src="/presentation/meaningful-conversation.jpg"
            alt="AI-generated fictional founders in conversation at a conference"
            width="1200"
            height="800"
          />
          <div className="pres-mag-cover-foot">
            <p>
              3 people who challenged my thinking.
              <br />1 idea I want to build next.
            </p>
            <span>
              OCTOBER 24, 2026
              <br />
              SAN FRANCISCO
            </span>
          </div>
        </div>
        <div className="pres-mag-page pres-mag-inside">
          <div className="pres-mag-masthead">
            <span>THE CONNECTIONS ISSUE</span>
            <span>02</span>
          </div>
          <span className="pres-mag-kicker">PEOPLE I MET</span>
          <div className="pres-editorial-profile">
            <div>JL</div>
            <section>
              <h4>
                Different skills.
                <br />
                <em>Shared ambition.</em>
              </h4>
              <p>Jordan Lee · synthetic demo identity</p>
            </section>
          </div>
          <p className="pres-mag-editorial-copy">
            A product perspective meets a passion for agent systems. An idea
            begins to feel possible.
          </p>
          <div className="pres-mag-rule" />
          <span className="pres-mag-kicker">IDEAS WORTH KEEPING</span>
          <h4 className="pres-mag-idea">
            Build the thing
            <br />
            <em>only we could build.</em>
          </h4>
          <div className="pres-mag-next">
            <span>NEXT STEPS</span>
            <p>
              <Check size={12} /> Reconnect with Jordan
            </p>
            <p>
              <Check size={12} /> Sketch the first prototype
            </p>
          </div>
          <div className="pres-mag-page-footer">
            <span>Synthetic content · no recording activated</span>
            <span>02 — 03</span>
          </div>
        </div>
      </div>
      <div className="pres-magazine-credit">
        <span>
          <span className="pres-omi-mark">o</span> OMI conversation insights
        </span>
        <span>
          <LockKeyhole size={12} /> With participant consent. Always.
        </span>
      </div>
    </section>
  );
}
