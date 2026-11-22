"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

type ActionResult = { ok?: true; error?: string };

export async function createMember(input: {
  fullName: string;
  roleOrDivision?: string;
  phoneNumber?: string;
  dailyWage: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Nama wajib diisi." };
  if (!Number.isFinite(input.dailyWage) || input.dailyWage < 0) {
    return { error: "Nominal upah tidak valid." };
  }
  await db.member.create({
    data: {
      fullName,
      roleOrDivision: input.roleOrDivision?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      dailyWage: Math.round(input.dailyWage),
    },
  });
  revalidatePath("/members");
  revalidatePath("/");
  revalidatePath("/payroll");
  return { ok: true };
}

export async function updateMember(
  id: string,
  input: {
    fullName: string;
    roleOrDivision?: string;
    phoneNumber?: string;
    dailyWage: number;
    isActive: boolean;
  },
): Promise<ActionResult> {
  await requireAdmin();
  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Nama wajib diisi." };
  if (!Number.isFinite(input.dailyWage) || input.dailyWage < 0) {
    return { error: "Nominal upah tidak valid." };
  }
  await db.member.update({
    where: { id },
    data: {
      fullName,
      roleOrDivision: input.roleOrDivision?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      dailyWage: Math.round(input.dailyWage),
      isActive: input.isActive,
    },
  });
  revalidatePath("/members");
  revalidatePath("/");
  revalidatePath("/payroll");
  return { ok: true };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.member.delete({ where: { id } });
  revalidatePath("/members");
  revalidatePath("/");
  revalidatePath("/payroll");
  return { ok: true };
}
