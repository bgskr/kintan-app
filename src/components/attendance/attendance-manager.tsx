"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Check } from "lucide-react";
import { addDays, formatDateId, cn } from "@/lib/utils";
import { saveAttendance } from "@/actions/attendance-actions";

type Member = { id: string; fullName: string; roleOrDivision: string };

export function AttendanceManager({
  date,
  today,
  members,
  presentMemberIds,
}: {
  date: string;
  today: string;
  members: Member[];
  presentMemberIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(presentMemberIds),
  );
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();



  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) => m.fullName.toLowerCase().includes(s));
  }, [members, q]);

  function go(nextDate: string) {
    router.push(`/?date=${nextDate}`);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(members.map((m) => m.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAttendance({
        date,
        memberIds: [...selected],
      });
      if (res?.error) setMsg({ type: "err", text: res.error });
      else setMsg({ type: "ok", text: "Absensi berhasil disimpan." });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => go(addDays(date, -1))}
            className="rounded-lg p-2 text-muted hover:bg-slate-100"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 text-center">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && go(e.target.value)}
              className="mx-auto block rounded-lg border border-border px-2 py-1 text-sm font-medium text-foreground"
            />
            <p className="mt-1 truncate text-xs text-muted">
              {formatDateId(date)}
              {date === today ? " (Hari ini)" : ""}
            </p>
          </div>
          <button
            onClick={() => go(addDays(date, 1))}
            className="rounded-lg p-2 text-muted hover:bg-slate-100"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama anggota..."
            className="h-11 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4"
          />
        </div>
        <button
          onClick={selected.size === members.length ? clearAll : selectAll}
          className="shrink-0 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary"
        >
          {selected.size === members.length ? "Batal Semua" : "Pilih Semua"}
        </button>
      </div>

      {msg ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            msg.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600",
          )}
          role="status"
        >
          {msg.text}
        </p>
      ) : null}

      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Belum ada anggota aktif. Tambahkan di menu Anggota.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Nama tidak ditemukan.
          </div>
        ) : (
          filtered.map((m) => {
            const checked = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  checked
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface hover:border-orange-200",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{m.fullName}</p>
                  <p className="truncate text-sm text-muted">
                    {m.roleOrDivision || "Tanpa divisi"}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border",
                    checked
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white",
                  )}
                  aria-hidden="true"
                >
                  {checked ? <Check className="size-4" strokeWidth={3} /> : null}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="sticky bottom-20 z-20 -mx-1 rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Terpilih:{" "}
            <span className="font-semibold text-foreground">{selected.size}</span>{" "}
            anggota
          </p>
          <button
            onClick={save}
            disabled={pending || members.length === 0}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </div>
    </div>
  );
}
