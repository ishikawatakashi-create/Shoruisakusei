import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDocumentNumber, resolveNextSequence, type SequenceSnapshot } from "@/lib/numbering";
import { DOCUMENT_NUMBER_PREFIXES, type DocumentType } from "@/types/document";

type NumberingClient = Prisma.TransactionClient | typeof prisma;

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

/** 書類番号を採番する（reserveDocumentNumber のエイリアス）。API・サービスから利用。 */
export async function generateDocumentNumber(
  documentType: DocumentType,
  client: NumberingClient = prisma
): Promise<string> {
  return reserveDocumentNumber(documentType, client);
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
