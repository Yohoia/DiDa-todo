import type { Metadata } from "next";
import { ListPage } from "@/features/tasks/list-page";

export const metadata: Metadata = { title: "Work & Projects" };

export default function Page() {
  return <ListPage />;
}
