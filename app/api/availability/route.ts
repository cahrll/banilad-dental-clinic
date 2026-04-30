import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getAvailableSlots } from "@/lib/availability";

const MAX_WINDOW_DAYS = 90;

export async function GET(request: NextRequest) {
  await requireUser();

  const sp = request.nextUrl.searchParams;

  const dentistIds = (sp.get("dentistIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const durationMinutes = Number(sp.get("durationMinutes"));
  const fromRaw = sp.get("from");
  const toRaw = sp.get("to");
  const excludeAppointmentId = sp.get("excludeAppointmentId") ?? undefined;

  if (
    dentistIds.length === 0 ||
    dentistIds.length > 20 ||
    !dentistIds.every((id) => /^[0-9a-fA-F]{24}$/.test(id))
  ) {
    return NextResponse.json({ error: "Invalid dentistIds." }, { status: 400 });
  }
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 480
  ) {
    return NextResponse.json({ error: "Invalid durationMinutes." }, { status: 400 });
  }
  if (!fromRaw || !toRaw) {
    return NextResponse.json({ error: "Missing from/to." }, { status: 400 });
  }
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ error: "Invalid from/to." }, { status: 400 });
  }
  if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Window too wide." }, { status: 400 });
  }
  if (excludeAppointmentId && !/^[0-9a-fA-F]{24}$/.test(excludeAppointmentId)) {
    return NextResponse.json({ error: "Invalid excludeAppointmentId." }, { status: 400 });
  }

  const days = await getAvailableSlots({
    dentistIds,
    durationMinutes,
    from,
    to,
    excludeAppointmentId,
  });

  return NextResponse.json(
    { days },
    { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } },
  );
}
