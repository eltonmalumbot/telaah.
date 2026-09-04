"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  Copy,
  Download,
  Layers3,
  ScanText,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { csvSafe, type Reviewed } from "@/lib/analysis";
import { qualityScore, rankQuality } from "@/lib/quality";
import styles from "./analysis-dashboard.module.css";

type Props = {
  rows: Reviewed[];
  sourceName: string;
};

const QUALITY_BANDS = [
  { label: "80–100", min: 80, max: 100 },
  { label: "60–79", min: 60, max: 79 },
  { label: "40–59", min: 40, max: 59 },
  { label: "20–39", min: 20, max: 39 },
  { label: "0–19", min: 0, max: 19 },
];

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function groupName(row: Reviewed) {
  return row.group.trim() || "Tanpa grup";
}

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AnalysisDashboard({ rows, sourceName }: Props) {
  const groups = useMemo(
    () => [...new Set(rows.map(groupName))].sort((a, b) => a.localeCompare(b, "id")),
    [rows],
  );
  const [group, setGroup] = useState("all");

  const filtered = useMemo(
    () => (group === "all" ? rows : rows.filter((row) => groupName(row) === group)),
    [rows, group],
  );

  const scored = useMemo(
    () => filtered.filter((row) => row.quality),
    [filtered],
  );
  const ranked = useMemo(() => rankQuality(filtered), [filtered]);
  const top = useMemo(
    () =>
      ranked
        .filter((row) => row.quality && (row.qualityRank ?? Infinity) <= 10)
        .sort(
          (a, b) =>
            (a.qualityRank ?? Infinity) - (b.qualityRank ?? Infinity) ||
            qualityScore(b.quality!) - qualityScore(a.quality!) ||
            a.name.localeCompare(b.name, "id"),
        ),
    [ranked],
  );

  const signalParticipants = filtered.filter(
    (row) => row.analysis.signals.length > 0,
  ).length;
  const duplicateParticipants = filtered.filter((row) => row.exactCount > 1).length;
  const confirmed = scored.filter((row) => row.quality?.confirmed).length;
  const averageScore = scored.length
    ? Math.round(
        scored.reduce((sum, row) => sum + qualityScore(row.quality!), 0) /
          scored.length,
      )
    : null;
  const averageWords = filtered.length
    ? Math.round(
        filtered.reduce((sum, row) => sum + row.analysis.words, 0) /
          filtered.length,
      )
    : 0;

  const signalStats = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    filtered.forEach((row) => {
      row.analysis.signals.forEach((signal) => {
        const current = map.get(signal.id);
        map.set(signal.id, {
          title: signal.title,
          count: (current?.count ?? 0) + 1,
        });
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filtered]);

  const qualityBands = useMemo(
    () =>
      QUALITY_BANDS.map((band) => ({
        ...band,
        count: scored.filter((row) => {
          const score = qualityScore(row.quality!);
          return score >= band.min && score <= band.max;
        }).length,
      })),
    [scored],
  );

  const groupStats = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => map.set(groupName(row), (map.get(groupName(row)) ?? 0) + 1));
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
  }, [rows]);

  const duplicateClusters = useMemo(() => {
    const map = new Map<string, Reviewed[]>();
    filtered.forEach((row) => {
      if (!row.response1.trim() && !row.response2.trim()) return;
      const key = JSON.stringify([row.response1, row.response2]);
      const bucket = map.get(key) ?? [];
      bucket.push(row);
      map.set(key, bucket);
    });
    return [...map.values()]
      .filter((cluster) => cluster.length > 1)
      .sort((a, b) => b.length - a.length || a[0].id - b[0].id)
      .slice(0, 6);
  }, [filtered]);

  const maxSignal = Math.max(1, ...signalStats.map((item) => item.count));
  const maxGroup = Math.max(1, ...groupStats.map((item) => item.count));

  function exportSummary() {
    const filterLabel = group === "all" ? "Semua grup" : group;
    const summary = [
      ["Sumber file", sourceName || "Proyek tersimpan"],
      ["Filter grup", filterLabel],
      ["Respons", filtered.length],
      ["Respons dengan pola ditandai", signalParticipants],
      ["Respons dalam kelompok identik", duplicateParticipants],
      ["Respons memiliki skor kualitas", scored.length],
      ["Rata-rata skor kualitas", averageScore ?? "Belum tersedia"],
      ["Penilaian dikonfirmasi", confirmed],
      ["Rata-rata jumlah kata", averageWords],
    ];
    const topRows = top.map((row) => [
      row.qualityRank ?? "",
      row.name,
      groupName(row),
      row.quality ? qualityScore(row.quality) : "",
      row.quality?.confirmed ? "Dikonfirmasi" : "Belum dikonfirmasi",
    ]);
    const csv =
      "\ufeff" +
      [
        ["RINGKASAN DASHBOARD", "NILAI"],
        ...summary,
        [],
        ["PERINGKAT", "PESERTA", "GRUP", "SKOR", "STATUS REVIEW"],
        ...topRows,
      ]
        .map((line) => line.map(csvSafe).join(","))
        .join("\r\n");
    downloadCsv(csv, "ringkasan-dashboard-telaah.csv");
  }

  if (!rows.length) {
    return (
      <div className={styles.empty}>
        <BarChart3 size={34} />
        <h3>Belum ada data untuk diringkas.</h3>
        <p>Impor file peserta dan jalankan pemeriksaan terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.toolbar}>
        <div>
          <span className={styles.eyebrow}>DASHBOARD ANALISIS</span>
          <h2>Ringkasan respons peserta</h2>
          <p>
            {sourceName || "Proyek tersimpan"} · {filtered.length.toLocaleString("id")} respons dalam tampilan
          </p>
        </div>
        <div className={styles.toolbarActions}>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className={styles.groupSelect} aria-label="Filter dashboard berdasarkan grup">
              <SelectValue placeholder="Semua grup" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua grup</SelectItem>
              {groups.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportSummary}>
            <Download size={16} />
            Ringkasan CSV
          </Button>
        </div>
      </div>

      <section className={styles.kpis} aria-label="Ringkasan indikator">
        <article>
          <Users size={19} />
          <strong>{filtered.length.toLocaleString("id")}</strong>
          <span>Respons</span>
          <small>Dalam filter aktif</small>
        </article>
        <article>
          <Trophy size={19} />
          <strong>{averageScore ?? "—"}</strong>
          <span>Rata-rata kualitas</span>
          <small>{scored.length ? `Dari ${scored.length} respons bernilai` : "Isi acuan tugas untuk menilai"}</small>
        </article>
        <article>
          <ScanText size={19} />
          <strong>{signalParticipants.toLocaleString("id")}</strong>
          <span>Pola ditandai</span>
          <small>{pct(signalParticipants, filtered.length)}% dari respons</small>
        </article>
        <article>
          <Copy size={19} />
          <strong>{duplicateParticipants.toLocaleString("id")}</strong>
          <span>Dalam kelompok identik</span>
          <small>{pct(duplicateParticipants, filtered.length)}% dari respons</small>
        </article>
        <article>
          <BadgeCheck size={19} />
          <strong>{confirmed.toLocaleString("id")}</strong>
          <span>Review dikonfirmasi</span>
          <small>{pct(confirmed, scored.length)}% dari respons bernilai</small>
        </article>
        <article>
          <Layers3 size={19} />
          <strong>{averageWords.toLocaleString("id")}</strong>
          <span>Rata-rata kata</span>
          <small>Informasi deskriptif, bukan skor</small>
        </article>
      </section>

      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <header>
            <div>
              <span>POLA BAHASA</span>
              <h3>Penanda yang paling sering muncul</h3>
            </div>
            <strong>{signalParticipants}</strong>
          </header>
          {signalStats.length ? (
            <div className={styles.barList}>
              {signalStats.slice(0, 6).map((item) => (
                <div className={styles.barRow} key={item.title}>
                  <div>
                    <span>{item.title}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className={styles.track}>
                    <i style={{ width: `${(item.count / maxSignal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Tidak ada pola bahasa yang ditandai dalam filter ini.</p>
          )}
          <p className={styles.panelNote}>Jumlah menunjukkan respons yang memicu aturan tersebut. Ini bukan probabilitas AI.</p>
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <span>KUALITAS JAWABAN</span>
              <h3>Distribusi skor rubrik</h3>
            </div>
            <strong>{scored.length}</strong>
          </header>
          {scored.length ? (
            <div className={styles.bandList}>
              {qualityBands.map((band) => (
                <div key={band.label}>
                  <span>{band.label}</span>
                  <div className={styles.track}>
                    <i style={{ width: `${pct(band.count, scored.length)}%` }} />
                  </div>
                  <strong>{band.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Belum ada skor. Isi pertanyaan / tujuan tugas lalu periksa file kembali.</p>
          )}
          <div className={styles.reviewProgress}>
            <div>
              <span>Progres konfirmasi reviewer</span>
              <strong>{confirmed}/{scored.length}</strong>
            </div>
            <div className={styles.track}>
              <i style={{ width: `${pct(confirmed, scored.length)}%` }} />
            </div>
          </div>
        </section>
      </div>

      <div className={styles.gridTwoWide}>
        <section className={styles.panel}>
          <header>
            <div>
              <span>KANDIDAT TERATAS</span>
              <h3>Top 10 berdasarkan rubrik kualitas</h3>
            </div>
            <Trophy size={20} />
          </header>
          {top.length ? (
            <div className={styles.rankingList}>
              {top.slice(0, 12).map((row) => (
                <article key={row.id}>
                  <span className={styles.rank}>#{row.qualityRank}</span>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{groupName(row)} · Respons #{row.id}</small>
                  </div>
                  <strong className={styles.score}>{qualityScore(row.quality!)}</strong>
                  <span className={row.quality?.confirmed ? styles.confirmed : styles.pending}>
                    {row.quality?.confirmed ? "Dikonfirmasi" : "Perlu review"}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Belum ada kandidat karena skor kualitas belum tersedia.</p>
          )}
          {top.length > 10 && <p className={styles.panelNote}>Jumlah dapat lebih dari 10 bila ada nilai seri pada batas peringkat kesepuluh.</p>}
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <span>DUPLIKASI</span>
              <h3>Kelompok jawaban identik terbesar</h3>
            </div>
            <Copy size={20} />
          </header>
          {duplicateClusters.length ? (
            <div className={styles.clusterList}>
              {duplicateClusters.map((cluster, index) => (
                <article key={`${cluster[0].id}-${index}`}>
                  <span>{cluster.length} peserta</span>
                  <div>
                    {cluster.slice(0, 5).map((row) => (
                      <strong key={row.id}>{row.name}<small>{groupName(row)}</small></strong>
                    ))}
                    {cluster.length > 5 && <em>+{cluster.length - 5} peserta lain</em>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Tidak ada pasangan jawaban yang sama persis dalam filter ini.</p>
          )}
        </section>
      </div>

      <section className={styles.panel}>
        <header>
          <div>
            <span>KOMPOSISI DATASET</span>
            <h3>Jumlah peserta per grup</h3>
          </div>
          <Users size={20} />
        </header>
        <div className={styles.groupGrid}>
          {groupStats.slice(0, 12).map((item) => (
            <div key={item.name}>
              <div>
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>
              <div className={styles.track}>
                <i style={{ width: `${(item.count / maxGroup) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        {groupStats.length > 12 && <p className={styles.panelNote}>Menampilkan 12 grup terbesar dari {groupStats.length} grup.</p>}
      </section>

      <aside className={styles.caution}>
        <ScanText size={20} />
        <div>
          <strong>Dashboard ini tidak menentukan siapa yang memakai AI.</strong>
          <p>Pola bahasa, duplikasi, dan skor kualitas ditampilkan sebagai dimensi terpisah. Gunakan detail respons dan konfirmasi reviewer sebelum mengambil keputusan.</p>
        </div>
      </aside>
    </div>
  );
}
