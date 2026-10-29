/**
 * Dictionary and helper for human-readable explanations of CV screening document integrity flags.
 */

export const FLAG_EXPLANATIONS: Record<string, string> = {
  TYPESAFE_LIVE: 'Diverifikasi langsung oleh AI engine resmi TypeSafe',
  NO_EVIDENCE_FOUND: 'Bukti kualifikasi tidak ditemukan di teks CV',
  DATE_YEAR_ONLY_INFERRED: 'Periode kerja hanya mencantumkan tahun, durasi diestimasi',
  DATE_ANOMALY: 'Urutan kronologi tanggal kerja terdeteksi janggal atau tumpang tindih',
  JEV_ROLE_FAMILY_LOW_CONFIDENCE: 'Judul posisi di CV kurang spesifik/tidak lazim',
  LOW_CONFIDENCE: 'Kepastian analisis AI di bawah ambang batas, perlu ditinjau manual',
  JEV_LOW_CONFIDENCE: 'Kepastian analisis AI di bawah ambang batas, perlu ditinjau manual',
  GROUNDING_FAIL: 'Kutipan bukti belum terverifikasi 100% pada teks asli CV',
  HIDDEN_TEXT: 'Terdeteksi teks tersembunyi berukuran 0 atau warna transparan',
  HIDDEN_TEXT_SANITIZED: 'Terdeteksi teks tersembunyi berukuran 0 atau warna transparan',
  PROMPT_INJECTION: 'Terdeteksi upaya instruksi manipulatif di dalam CV',
  PROMPT_INJECTION_NEUTRALIZED: 'Terdeteksi upaya instruksi manipulatif di dalam CV',
  KEYWORD_STUFFING: 'Pengulangan kata kunci teknis yang tidak wajar',
  HYBRID_PORTFOLIO_CV: 'Dokumen memuat halaman portfolio/lampiran tambahan',
  BOUNDARY_ISOLATED: 'Halaman lampiran/portofolio berhasil diisolasi dari isi CV',
  // Domain/Audit fallbacks
  EMPTY_DOCUMENT: 'Dokumen kosong atau teks tidak dapat diekstrak',
  PASSWORD_PROTECTED: 'Dokumen terenkripsi atau membutuhkan kata sandi',
  IRRELEVANT_PROFILE: 'Profil CV tidak selaras dengan domain posisi yang dilamar',
}

/**
 * Returns human-readable explanation for a given document integrity flag.
 * Falls back to "(Catatan audit sistem)" for any unmapped flag.
 */
export function getFlagExplanation(flag: string): string {
  if (!flag) return 'Catatan audit sistem'
  const trimmed = flag.trim()
  if (FLAG_EXPLANATIONS[trimmed]) {
    return FLAG_EXPLANATIONS[trimmed]
  }
  if (trimmed.startsWith('POSSIBLE_DUPLICATE') || trimmed.startsWith('EXACT_DUPLICATE')) {
    return 'Terdeteksi potensi duplikasi berkas dengan kandidat lain'
  }
  return 'Catatan audit sistem'
}
