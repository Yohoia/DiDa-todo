import { LandingPage } from "@/features/landing/landing-page";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  return <LandingPage loginRequired={query.login === "1"} />;
}
