import { getProfile } from "@/features/profile/profile-service";

export async function GET() {
  const profile = await getProfile();
  return Response.json(profile, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
