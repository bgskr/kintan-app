import { db } from "@/lib/db";
import { jakartaDateString } from "@/lib/utils";
import { AttendanceManager } from "@/components/attendance/attendance-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function AttendancePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = jakartaDateString();
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : today;

  const [members, attendances] = await Promise.all([
    db.member.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
    }),
    db.attendance.findMany({
      where: { attendanceDate: new Date(`${date}T00:00:00.000Z`) },
      select: { memberId: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Absensi Harian</h1>
        <p className="text-sm text-muted">Pilih anggota yang hadir, lalu simpan.</p>
      </div>
      <AttendanceManager
        key={`${date}:${attendances.map((a) => a.memberId).sort().join(",")}`}
        date={date}
        today={today}
        members={members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          roleOrDivision: m.roleOrDivision ?? "",
        }))}
        presentMemberIds={attendances.map((a) => a.memberId)}
      />
    </div>
  );
}
