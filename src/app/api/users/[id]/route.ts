import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { invalidateResource } from "@/lib/cache";
import { serializeAppUser, updateManagedUser } from "@/lib/app-users";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const result = await updateManagedUser(id, auth.user.id, {
      role: body.role,
      isUse: body.isUse,
      memberId: body.memberId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await invalidateResource("users");
    return NextResponse.json(serializeAppUser(result.row, auth.user.id));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update user");
  }
}
