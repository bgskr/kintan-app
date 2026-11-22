import { db } from "@/lib/db";
import { MembersManager } from "@/components/members/members-manager";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await db.member.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Master Anggota</h1>
        <p className="text-sm text-muted">
          Kelola anggota dan nominal upah harian.
        </p>
      </div>
      <MembersManager
        initialMembers={members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          roleOrDivision: m.roleOrDivision ?? "",
          phoneNumber: m.phoneNumber ?? "",
          dailyWage: m.dailyWage,
          isActive: m.isActive,
        }))}
      />
    </div>
  );
}
