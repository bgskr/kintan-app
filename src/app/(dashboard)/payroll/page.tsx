import { db } from "@/lib/db";
import { jakartaDateString } from "@/lib/utils";
import { PayrollManager } from "@/components/payroll/payroll-manager";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ start?: string; end?: string }> };

function monthRange(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(y, m, 0)); // last day of month
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams;
  const today = jakartaDateString();
  const def = monthRange(today);
  const start =
    typeof params.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.start)
      ? params.start
      : def.start;
  const end =
    typeof params.end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.end)
      ? params.end
      : def.end;

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  const [members, grouped] = await Promise.all([
    db.member.findMany({ orderBy: [{ isActive: "desc" }, { fullName: "asc" }] }),
    db.attendance.groupBy({
      by: ["memberId"],
      where: { attendanceDate: { gte: startDate, lte: endDate } },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(grouped.map((g) => [g.memberId, g._count._all]));

  const rows = members
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roleOrDivision: m.roleOrDivision ?? "",
      isActive: m.isActive,
      defaultDailyWage: m.dailyWage,
      totalDays: countMap.get(m.id) ?? 0,
    }))
    .filter((r) => r.isActive || r.totalDays > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Rekap Gaji</h1>
        <p className="text-sm text-muted">
          Hitung gaji berdasarkan kehadiran dan nominal harian.
        </p>
      </div>
      <PayrollManager start={start} end={end} today={today} rows={rows} />
    </div>
  );
}
