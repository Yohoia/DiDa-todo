import { getProfile } from "@/features/profile/profile-service";
import { getAuthenticatedSession } from "@/lib/server/workspace-session";

export async function GET() {
  if (!(await getAuthenticatedSession())) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const profile = await getProfile();
  return Response.json(profile, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
