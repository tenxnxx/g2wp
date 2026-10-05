import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import {
  addTeam,
  clearInactive,
  clearTeams,
  completeSession,
  fillTeams,
  loadTeamBoard,
  moveAssignment,
  removeTeam,
  reorderTeams,
  startSession,
  swapAssignments,
  updateTeam,
} from "@/lib/team-board";
import { TeamSlotType } from "@/generated/prisma/enums";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const board = await remember(
      "teams:board",
      ["teams"],
      CACHE_TTL.board,
      () => loadTeamBoard(actorLabel(auth.user)),
    );
    return NextResponse.json(board);
  } catch (error) {
    console.error("GET /api/teams/board", error);
    return prismaErrorResponse(error, "Failed to load team board");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const actor = actorLabel(auth.user);
    const saved = async (body: unknown) => {
      await invalidateResource("teams");
      return NextResponse.json(body);
    };

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;
    const action = body.action;

    if (action === "fill") {
      return saved(await fillTeams(actor));
    }
    if (action === "clearInactive") {
      return saved(await clearInactive(actor));
    }
    if (action === "clearTeams") {
      return saved(await clearTeams(actor));
    }
    if (action === "start") {
      const result = await startSession(actor);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "complete") {
      const result = await completeSession(actor);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "addTeam") {
      const result = await addTeam(actor, {
        name: String(body.name ?? ""),
        mainLimit: Number(body.mainLimit),
        reserveLimit: Number(body.reserveLimit),
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "updateTeam") {
      const mainLimit = Number(body.mainLimit);
      const reserveLimit = Number(body.reserveLimit);
      const result = await updateTeam(actor, String(body.teamId ?? ""), {
        name: String(body.name ?? ""),
        mainLimit,
        reserveLimit,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "reorderTeams") {
      const teamIds = Array.isArray(body.teamIds)
        ? body.teamIds.filter((id): id is string => typeof id === "string")
        : [];
      const result = await reorderTeams(actor, teamIds);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "removeTeam") {
      const result = await removeTeam(actor, String(body.teamId ?? ""));
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "swap") {
      const result = await swapAssignments(
        actor,
        String(body.assignmentId ?? ""),
        String(body.targetAssignmentId ?? ""),
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }
    if (action === "move") {
      const slotType = body.slotType;
      if (
        slotType !== TeamSlotType.waiting &&
        slotType !== TeamSlotType.main &&
        slotType !== TeamSlotType.reserve &&
        slotType !== TeamSlotType.inactive
      ) {
        return NextResponse.json({ error: "ตำแหน่งไม่ถูกต้อง" }, { status: 400 });
      }
      const result = await moveAssignment(actor, {
        assignmentId: String(body.assignmentId ?? ""),
        slotType,
        teamId: typeof body.teamId === "string" ? body.teamId : null,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return saved(result.data);
    }

    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/teams/board", error);
    return prismaErrorResponse(error, "Failed to update team board");
  }
}
