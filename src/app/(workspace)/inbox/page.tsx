import type { Metadata } from "next";
import { InboxPage } from "@/features/tasks/inbox-page";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return <InboxPage />;
}
