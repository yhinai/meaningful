import type { Metadata } from "next";
import PresentationDeck from "@/components/presentation/PresentationDeck";
export const metadata: Metadata = {
  title: "MeaningfulMeet — Every connection begins with possibility.",
  description:
    "Your AI networks. You connect. Your story lives on. A seven-part presentation.",
};
export default function PresentationPage() {
  return <PresentationDeck />;
}
