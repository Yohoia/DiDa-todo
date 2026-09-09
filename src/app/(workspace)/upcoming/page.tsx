import type { Metadata } from "next";
import { UpcomingPage } from "@/features/tasks/upcoming-page";

export const metadata: Metadata = { title: "Upcoming" };

export default function Page() {
  return <UpcomingPage />;
}
