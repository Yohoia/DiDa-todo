import { buildAccountExport } from "@/features/account/account-export-service";
import { getAuthenticatedSession } from "@/lib/server/workspace-session";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  try {
    const payload = await buildAccountExport(session.supabase, session.user);
    const filename = `dida-todo-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
