"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function dateOnly(dateStr: string): Date {
  // Store DATE as UTC midnight; dateStr is YYYY-MM-DD (Asia/Jakarta calendar day).
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function saveAttendance(input: {
  date: string;
  memberIds: string[];
}): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "Tanggal tidak valid." };
  }
  const attendanceDate = dateOnly(input.date);
  const uniqueIds = [...new Set(input.memberIds)];

  await db.$transaction(async (tx) => {
    // Replace attendance for active members only; keep inactive members' history intact.
    await tx.attendance.deleteMany({
      where: { attendanceDate, member: { isActive: true } },
    });
    if (uniqueIds.length > 0) {
      const members = await tx.member.findMany({
        where: { id: { in: uniqueIds }, isActive: true },
        select: { id: true },
      });
      if (members.length > 0) {
        await tx.attendance.createMany({
          data: members.map((m) => ({
            memberId: m.id,
            attendanceDate,
            status: "PRESENT",
          })),
        });
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/payroll");
  return { ok: true };
}
