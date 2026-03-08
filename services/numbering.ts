import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_NUMBER_PREFIXES, type DocumentType } from "@/types/document";

type NumberingClient = Prisma.TransactionClient | typeof prisma;

interface SequenceSnapshot {
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

async function ensureSequence(
  client: NumberingClient,
  documentType: DocumentType,
  currentYear: number
) {
  await client.numberSequence.upsert({
    where: { documentType },
    update: {},
    create: {
      documentType,
      prefix: DOCUMENT_NUMBER_PREFIXES[documentType],
      currentYear,
      currentSeq: 0,
      digits: 4,
    },
  });

  return client.numberSequence.findUniqueOrThrow({
    where: { documentType },
  });
}

export async function previewDocumentNumber(documentType: DocumentType): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seq = await prisma.numberSequence.findUnique({
    where: { documentType },
  });

  if (!seq) {
    return buildDocumentNumber(DOCUMENT_NUMBER_PREFIXES[documentType], currentYear, 1, 4);
  }

  const next = resolveNextSequence(seq, currentYear);
  return buildDocumentNumber(next.prefix, next.year, next.sequence, next.digits);
}

export async function reserveDocumentNumber(
  documentType: DocumentType,
  client: NumberingClient = prisma
): Promise<string> {
  const currentYear = new Date().getFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sequence = await ensureSequence(client, documentType, currentYear);
    const next = resolveNextSequence(sequence, currentYear);

    const updated = await client.numberSequence.updateMany({
      where: {
        documentType,
        currentYear: next.previousYear,
        currentSeq: next.previousSequence,
      },
      data: {
        currentYear: next.year,
        currentSeq: next.sequence,
      },
    });

    if (updated.count === 1) {
      return buildDocumentNumber(next.prefix, next.year, next.sequence, next.digits);
    }
  }

  throw new Error("採番に失敗しました");
}

export async function isDocumentNumberUnique(
  documentType: DocumentType,
  documentNumber: string,
  excludeId?: string,
  client: NumberingClient = prisma
): Promise<boolean> {
  const existing = await client.document.findFirst({
    where: {
      documentType,
      documentNumber,
      id: excludeId ? { not: excludeId } : undefined,
    },
  });
  return !existing;
}
