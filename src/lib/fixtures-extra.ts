import type { Person } from "./types";

const names = [
  "Aisha Rahman",
  "Mateo Silva",
  "Grace Liu",
  "Arjun Mehta",
  "Sophie Dubois",
  "Kwame Mensah",
  "Elena Petrova",
  "Rafael Santos",
  "Lina Hassan",
  "Owen Clarke",
  "Nadia Farouk",
  "Jasper de Vries",
  "Anika Rao",
  "Max Fischer",
  "Camila Torres",
  "Darius Reed",
  "Hana Suzuki",
  "Sebastian Cruz",
  "Leila Haddad",
  "Finn O'Connor",
  "Ibrahim Ali",
  "Luna Garcia",
  "Benji Taylor",
  "Mei Zhang",
  "Adrian Novak",
  "Fatima Zahra",
  "Rory Campbell",
  "Valentina Moretti",
  "Kiran Kapoor",
  "Nora Jensen",
  "Jamal Robinson",
  "Ines Oliveira",
  "Soren Berg",
  "Divya Iyer",
  "Marco Bianchi",
  "Nia Washington",
  "Ren Ito",
  "Clara Schmitt",
  "Malik Johnson",
  "Sara Kim",
  "Diego Alvarez",
  "Freya Wilson",
  "Rohan Desai",
  "Lucia Fernandez",
  "Isaac Brown",
  "Yara Mansour",
  "Hugo Larsson",
  "Naomi Stein",
  "Aarav Shah",
  "Esme Walker",
  "Tariq Ahmed",
  "Beatrice Hall",
  "Kenji Mori",
  "Zoe Mitchell",
  "Emilio Ruiz",
  "Maya Cohen",
  "Omar Khalil",
  "Alice Chen",
  "Santiago Vega",
  "Aditi Nair",
  "Julian Moore",
  "Noor Saleh",
  "Milo Evans",
  "Pia Becker",
  "Andre Ferreira",
  "Imani Davis",
  "Yuna Park",
  "Oscar Reed",
  "Sana Qureshi",
  "Louis Bernard",
  "Tessa Nguyen",
  "Idris Bello",
  "Amelia Scott",
  "Akira Watanabe",
  "Celeste Ray",
  "Hamza Malik",
  "Eva Lind",
  "Nikhil Patel",
  "Chiara Romano",
  "Sam Rivera",
];
const specialties = [
  ["Agent Engineer", "Aster Labs", "Agent orchestration", "Developer tools"],
  ["Technical Founder", "Morrow", "AI infrastructure", "Startups"],
  ["Research Lead", "Lucent Research", "Machine learning", "AI research"],
  ["Product Engineer", "Goodform", "Product strategy", "Design"],
  ["Platform Architect", "Northlight", "Cloud systems", "Developer tools"],
  ["Applied AI Lead", "Daybreak", "Human-centered AI", "Product strategy"],
  ["Data Engineer", "Clearstream", "Data systems", "Machine learning"],
  ["Founder & CTO", "Small Hours", "AI infrastructure", "Community"],
  ["Design Engineer", "Soft Signal", "Interaction design", "Design"],
  ["ML Systems Lead", "Fieldnotes AI", "Model evaluation", "Machine learning"],
] as const;
const colors = [
  "#e8e1f5",
  "#f2dfd5",
  "#ddebf5",
  "#dcebe3",
  "#eee4d8",
  "#e8e2ee",
];

/** Fictional, opted-in conference profiles. Stable IDs preserve old introductions. */
export function createExtraAttendees(eventId: string): Person[] {
  return names.map((name, index) => {
    const [role, company, specialty, topic] =
      specialties[index % specialties.length];
    const id = `usr_${String(index + 21).padStart(2, "0")}`;
    const offers = `${specialty}, AI infrastructure, and practical experience building AI agents.`;
    return {
      id,
      name,
      role,
      company:
        index < 10
          ? company
          : `${company} ${["Studio", "Works", "Collective", "Systems", "Labs", "Partners", "Research"][Math.floor(index / 10) - 1]}`,
      avatar: name
        .split(" ")
        .map((word) => word[0])
        .slice(0, 2)
        .join(""),
      color: colors[index % colors.length],
      topics: ["AI agents", topic],
      bio: `${name.split(" ")[0]} builds ${specialty.toLowerCase()} tools that help small teams do meaningful work. At this conference, they are looking for a complementary product partner and a thoughtful first conversation.`,
      score: 0,
      expertise: [specialty, "AI agents", topic],
      offers,
      seeks:
        "A product strategy collaborator or product cofounder to explore an AI agent project.",
      conversationStyle:
        index % 5 === 4 ? "Direct and focused" : "Thoughtful and curious",
      optIn: true,
      eventId,
      availability: true,
    };
  });
}
