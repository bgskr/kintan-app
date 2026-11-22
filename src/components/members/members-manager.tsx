"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, UserX, UserCheck, X } from "lucide-react";
import { formatRupiah, parseRupiahInput } from "@/lib/utils";
import { createMember, updateMember, deleteMember } from "@/actions/member-actions";

type Member = {
  id: string;
  fullName: string;
  roleOrDivision: string;
  phoneNumber: string;
  dailyWage: number;
  isActive: boolean;
};

type FormState = {
  id?: string;
  fullName: string;
  roleOrDivision: string;
  phoneNumber: string;
  dailyWage: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  fullName: "",
  roleOrDivision: "",
  phoneNumber: "",
  dailyWage: "",
  isActive: true,
};

export function MembersManager({ initialMembers }: { initialMembers: Member[] }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setError(null);
    setForm({ ...emptyForm });
  }
  function openEdit(m: Member) {
    setError(null);
    setForm({
      id: m.id,
      fullName: m.fullName,
      roleOrDivision: m.roleOrDivision,
      phoneNumber: m.phoneNumber,
      dailyWage: m.dailyWage ? String(m.dailyWage) : "",
      isActive: m.isActive,
    });
  }
  function close() {
    if (!pending) setForm(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const payload = {
      fullName: form.fullName,
      roleOrDivision: form.roleOrDivision,
      phoneNumber: form.phoneNumber,
      dailyWage: parseRupiahInput(form.dailyWage),
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = form.id
        ? await updateMember(form.id, payload)
        : await createMember(payload);
      if (res?.error) setError(res.error);
      else setForm(null);
    });
  }

  function onDelete(id: string) {
    if (!confirm("Hapus anggota ini? Riwayat absensi/gaji terkait juga terhapus.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMember(id);
      if (res?.error) setError(res.error);
    });
  }

  function onToggleActive(m: Member) {
    setError(null);
    startTransition(async () => {
      const res = await updateMember(m.id, { ...m, isActive: !m.isActive });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openAdd}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-hover"
      >
        <Plus className="size-4" /> Tambah Anggota
      </button>

      {error && !form ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="space-y-2">
        {initialMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Belum ada anggota. Tambahkan anggota pertama.
          </div>
        ) : (
          initialMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{m.fullName}</p>
                    {!m.isActive ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        Nonaktif
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">
                    {m.roleOrDivision || "Tanpa divisi"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatRupiah(m.dailyWage)}
                    <span className="font-normal text-muted"> / hari</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onToggleActive(m)}
                    className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-foreground"
                    aria-label={m.isActive ? "Nonaktifkan" : "Aktifkan"}
                    disabled={pending}
                  >
                    {m.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(m)}
                    className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-primary"
                    aria-label="Edit"
                    disabled={pending}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Hapus"
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {form.id ? "Edit Anggota" : "Tambah Anggota"}
              </h2>
              <button onClick={close} className="rounded-lg p-2 text-muted hover:bg-slate-100">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nama Lengkap">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={inputCls}
                  placeholder="Nama anggota"
                />
              </Field>
              <Field label="Divisi / Peran (opsional)">
                <input
                  value={form.roleOrDivision}
                  onChange={(e) => setForm({ ...form, roleOrDivision: e.target.value })}
                  className={inputCls}
                  placeholder="Tukang, Staf, dll."
                />
              </Field>
              <Field label="No. HP (opsional)">
                <input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className={inputCls}
                  placeholder="08..."
                  inputMode="tel"
                />
              </Field>
              <Field label="Upah Harian (Rp)">
                <input
                  required
                  value={form.dailyWage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dailyWage: e.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                  className={inputCls}
                  placeholder="150000"
                  inputMode="numeric"
                />
                {form.dailyWage ? (
                  <p className="mt-1 text-xs text-muted">
                    {formatRupiah(parseRupiahInput(form.dailyWage))}
                  </p>
                ) : null}
              </Field>
              {form.id ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  Anggota aktif
                </label>
              ) : null}
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {pending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4";
