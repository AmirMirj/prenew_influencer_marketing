import { ValidationError } from "@/src/domain/validate";
import { discover } from "@/src/workflow/discover";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  try {
    const shortlist = await discover(body);
    return Response.json(shortlist);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Discovery failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
