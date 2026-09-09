import type { Metadata } from "next";
import { CompletedPage } from "@/features/tasks/completed-page";

export const metadata: Metadata = { title: "Archive" };

export default function Page() {
  return <CompletedPage />;
}
