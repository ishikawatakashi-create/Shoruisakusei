export interface SequenceSnapshot {
  prefix: string;
  digits: number;
  currentYear: number;
  currentSeq: number;
  yearReset: boolean;
}

export function buildDocumentNumber(prefix: string, year: number, sequence: number, digits: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(digits, "0")}`;
}

export function resolveNextSequence(sequence: SequenceSnapshot, currentYear: number) {
  const reset = sequence.yearReset && sequence.currentYear !== currentYear;
  const nextSeq = reset ? 1 : sequence.currentSeq + 1;

  return {
    year: currentYear,
    sequence: nextSeq,
    prefix: sequence.prefix,
    digits: sequence.digits,
    previousYear: sequence.currentYear,
    previousSequence: sequence.currentSeq,
  };
}
