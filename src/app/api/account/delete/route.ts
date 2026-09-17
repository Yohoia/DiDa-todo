import {
  accountDeletionConfigured,
  deleteOwnAccount,
} from "@/features/account/account-deletion-service";
import { getAuthenticatedSession } from "@/lib/server/workspace-session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const session = await getAuthenticatedSession();
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  if (!accountDeletionConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (!session.user.email) {
    return Response.json({ error: "email_confirmation_required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const confirmedEmail =
    body && typeof body === "object" && "confirmEmail" in body
      ? String((body as { confirmEmail: unknown }).confirmEmail)
          .trim()
          .toLowerCase()
      : "";
  if (confirmedEmail !== session.user.email.toLowerCase()) {
    return Response.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  try {
    await deleteOwnAccount(session.user.id);
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "delete_failed";
    const status = code === "not_configured" ? 503 : 500;
    return Response.json({ error: code }, { status });
  }
}
