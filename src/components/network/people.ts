import { attendees } from "@/lib/fixtures";
import { portraitFor } from "@/lib/portraits";
export interface GraphPerson {
  id: string;
  name: string;
  role: string;
  company: string;
  topics: string[];
  avatar?: string;
  color?: string;
  bio?: string;
  score?: number;
}
export function withPortrait(person: GraphPerson, index: number): GraphPerson {
  return {
    ...person,
    avatar: person.avatar?.startsWith("http")
      ? person.avatar
      : portraitFor(person.id),
  };
}
export const previewPeople: GraphPerson[] = attendees.map(withPortrait);
