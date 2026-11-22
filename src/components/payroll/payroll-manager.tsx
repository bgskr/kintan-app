"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, CalendarRange } from "lucide-react";
import { formatRupiah, parseRupiahInput, cn } from "@/lib/utils";

type Row = {
  id: string;
  fullName: string;
  roleOrDivision: string;
  isActive: boolean;
  defaultDailyWage: number;
  totalDays: number;
};

function monthRange(dateStr: string, offset = 0) {
  const [y, m] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  const yy = d.getUTCFullYear();
  const mm = d.getUTCMonth() + 1;
  const start = `${yy}-${String(mm).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function weekRange(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const day = utc.getUTCDay(); // 0 Sun
  const diffToMon = (day + 6) % 7;
  const startD = new Date(Date.UTC(y, m - 1, d - diffToMon));
  const endD = new Date(Date.UTC(y, m - 1, d - diffToMon + 6));
  return {
    start: startD.toISOString().slice(0, 10),
    end: endD.toISOString().slice(0, 10),
  };
}

export function PayrollManager({
  start,
  end,
  today,
  rows,
}: {
  start: string;
  end: string;
  today: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, String(r.defaultDailyWage)])),
  );
  const [copied, setCopied] = useState(false);
  const [customStart, setCustomStart] = useState(start);
  const [customEnd, setCustomEnd] = useState(end);

  // Sync if rows change (keying in parent would also work; simple guard)
  const rowKey = rows.map((r) => `${r.id}:${r.defaultDailyWage}`).join("|");
  const [lastRowKey, setLastRowKey] = useState(rowKey);
  if (rowKey !== lastRowKey) {
    setLastRowKey(rowKey);
    setRates(Object.fromEntries(rows.map((r) => [r.id, String(r.defaultDailyWage)])));
  }

  const computed = useMemo(() => {
    return rows.map((r) => {
      const wage = parseRupiahInput(rates[r.id] ?? String(r.defaultDailyWage));
      const total = r.totalDays * wage;
      const changed = wage !== r.defaultDailyWage;
      return { ...r, wage, total, changed };
    });
  }, [rows, rates]);

  const grandTotal = computed.reduce((s, r) => s + r.total, 0);
  const totalDaysAll = computed.reduce((s, r) => s + r.totalDays, 0);

  function applyRange(s: string, e: string) {
    setCustomStart(s);
    setCustomEnd(e);
    router.push(`/payroll?start=${s}&end=${e}`);
  }

  async function copySummary() {
    const lines = [
      `*Rekap Gaji*`,
      `Periode: ${start} s/d ${end}`,
      "",
      ...computed
        .filter((r) => r.totalDays > 0 || r.wage > 0)
        .map(
          (r) =>
            `- ${r.fullName}: ${r.totalDays} hari x ${formatRupiah(r.wage)} = ${formatRupiah(r.total)}`,
        ),
      "",
      `*Total: ${formatRupiah(grandTotal)}*`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const presets = [
    { label: "Minggu Ini", range: weekRange(today) },
    { label: "Bulan Ini", range: monthRange(today, 0) },
    { label: "Bulan Lalu", range: monthRange(today, -1) },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = p.range.start === start && p.range.end === end;
            return (
              <button
                key={p.label}
                onClick={() => applyRange(p.range.start, p.range.end)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium border",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted hover:bg-slate-50",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted">Mulai</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-10 w-full rounded-lg border border-border px-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Sampai</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-10 w-full rounded-lg border border-border px-2 text-sm"
            />
          </label>
        </div>
        <button
          onClick={() => applyRange(customStart, customEnd)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-slate-50"
        >
          <CalendarRange className="size-4" /> Terapkan Periode
        </button>
      </div>

      <div className="rounded-xl bg-primary-soft border border-orange-100 p-4">
        <p className="text-sm text-muted">Total Pengeluaran Gaji</p>
        <p className="mt-1 text-2xl font-bold text-primary">
          {formatRupiah(grandTotal)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {computed.length} anggota · {totalDaysAll} total hari hadir
        </p>
      </div>

      <div className="space-y-3">
        {computed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Tidak ada data anggota.
          </div>
        ) : (
          computed.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-surface p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.fullName}</p>
                  <p className="text-xs text-muted">
                    {r.roleOrDivision || "Tanpa divisi"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  {r.totalDays} Hari
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-muted">Nominal / Hari</span>
                  <input
                    value={rates[r.id] ?? ""}
                    onChange={(e) =>
                      setRates((prev) => ({
                        ...prev,
                        [r.id]: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                    inputMode="numeric"
                    className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4"
                  />
                  {r.changed ? (
                    <span className="text-[11px] text-orange-600">
                      Diubah dari master ({formatRupiah(r.defaultDailyWage)})
                    </span>
                  ) : null}
                </label>
                <div className="space-y-1">
                  <span className="text-xs text-muted">Subtotal</span>
                  <div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold text-foreground">
                    {formatRupiah(r.total)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={copySummary}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-hover"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Tersalin" : "Salin Ringkasan WhatsApp"}
      </button>
    </div>
  );
}
