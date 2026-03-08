import path from "path";
import { mkdir, readdir, rename, rm, stat } from "fs/promises";
import { PassThrough, Readable } from "stream";
import { pipeline } from "stream/promises";
import archiver from "archiver";
import yauzl from "yauzl";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "@/lib/errors";

const BACKUP_JSON_NAME = "backup.json";
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const PDFS_DIR = path.join(DATA_DIR, "pdfs");
const IMPORT_STAGING_ROOT = path.join(DATA_DIR, ".backup-import");

type BackupCollection = Record<string, unknown>[];
type BackupRecord = Record<string, unknown>;

export interface BackupPayload {
  version: string;
  exportedAt: string;
  format: "document-creator-backup";
  data: {
    businessInfo: BackupCollection;
    clients: BackupCollection;
    products: BackupCollection;
    bankAccounts: BackupCollection;
    documents: BackupCollection;
    documentItems: BackupCollection;
    numberSequences: BackupCollection;
    appSettings: BackupCollection;
  };
  files: {
    uploads: string[];
    pdfs: string[];
  };
}

export interface ParsedBackupUpload {
  backup: BackupPayload;
  stagingRoot?: string;
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(rootDir: string, baseDir = rootDir): Promise<string[]> {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
          return listFiles(fullPath, baseDir);
        }
        return path.relative(baseDir, fullPath).replace(/\\/g, "/");
      })
    );
    return results.flat();
  } catch {
    return [];
  }
}

function normalizeBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== "object" || !("data" in raw) || typeof raw.data !== "object" || !raw.data) {
    throw new BadRequestError("Invalid backup format");
  }

  const value = raw as Record<string, any>;
  const data = value.data as Record<string, unknown>;

  return {
    version: typeof value.version === "string" ? value.version : "1.0",
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    format: "document-creator-backup",
    data: {
      businessInfo: Array.isArray(data.businessInfo) ? data.businessInfo : [],
      clients: Array.isArray(data.clients) ? data.clients : [],
      products: Array.isArray(data.products) ? data.products : [],
      bankAccounts: Array.isArray(data.bankAccounts) ? data.bankAccounts : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      documentItems: Array.isArray(data.documentItems) ? data.documentItems : [],
      numberSequences: Array.isArray(data.numberSequences) ? data.numberSequences : [],
      appSettings: Array.isArray(data.appSettings) ? data.appSettings : [],
    },
    files: {
      uploads: Array.isArray(value.files?.uploads) ? value.files.uploads : [],
      pdfs: Array.isArray(value.files?.pdfs) ? value.files.pdfs : [],
    },
  };
}

function parseBackupJson(raw: string) {
  try {
    return normalizeBackupPayload(JSON.parse(raw));
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError("バックアップJSONを解析できません");
  }
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [
    businessInfo,
    clients,
    products,
    bankAccounts,
    documents,
    documentItems,
    numberSequences,
    appSettings,
    uploads,
    pdfs,
  ] = await Promise.all([
    prisma.businessInfo.findMany(),
    prisma.client.findMany(),
    prisma.product.findMany(),
    prisma.bankAccount.findMany(),
    prisma.document.findMany(),
    prisma.documentItem.findMany(),
    prisma.numberSequence.findMany(),
    prisma.appSettings.findMany(),
    listFiles(UPLOADS_DIR),
    listFiles(PDFS_DIR),
  ]);

  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    format: "document-creator-backup",
    data: {
      businessInfo,
      clients,
      products,
      bankAccounts,
      documents,
      documentItems,
      numberSequences,
      appSettings,
    },
    files: {
      uploads,
      pdfs,
    },
  };
}

export async function createBackupExportResponse() {
  const payload = await buildBackupPayload();
  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (error) => {
    stream.destroy(error);
  });

  archive.pipe(stream);
  archive.append(JSON.stringify(payload, null, 2), { name: BACKUP_JSON_NAME });
  if (await pathExists(UPLOADS_DIR)) {
    archive.directory(UPLOADS_DIR, "uploads");
  }
  if (await pathExists(PDFS_DIR)) {
    archive.directory(PDFS_DIR, "pdfs");
  }
  void archive.finalize();

  const filename = `backup_${new Date().toISOString().slice(0, 10)}.zip`;
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function normalizeZipEntryPath(entryName: string) {
  const normalized = entryName.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new BadRequestError("Invalid backup entry");
  }
  return segments.join("/");
}

function readStreamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function openZip(buffer: Buffer) {
  return new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error || new BadRequestError("Invalid backup zip"));
        return;
      }
      resolve(zipFile);
    });
  });
}

async function extractZipBackup(buffer: Buffer, stagingRoot: string): Promise<ParsedBackupUpload> {
  const zipFile = await openZip(buffer);
  let backup: BackupPayload | null = null;

  await mkdir(path.join(stagingRoot, "uploads"), { recursive: true });
  await mkdir(path.join(stagingRoot, "pdfs"), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    zipFile.on("error", reject);
    zipFile.on("end", () => {
      if (!backup) {
        reject(new BadRequestError("backup.json が見つかりません"));
        return;
      }
      resolve();
    });
    zipFile.on("entry", (entry) => {
      void (async () => {
        const entryPath = normalizeZipEntryPath(entry.fileName);

        if (entryPath.endsWith("/")) {
          zipFile.readEntry();
          return;
        }

        zipFile.openReadStream(entry, async (error, stream) => {
          if (error || !stream) {
            reject(error || new BadRequestError("バックアップを読み込めません"));
            return;
          }

          try {
            if (entryPath === BACKUP_JSON_NAME) {
              const contents = await readStreamToBuffer(stream);
              backup = parseBackupJson(contents.toString("utf-8"));
            } else if (entryPath.startsWith("uploads/") || entryPath.startsWith("pdfs/")) {
              const destination = path.join(stagingRoot, entryPath);
              const resolvedDestination = path.resolve(destination);
              const resolvedStagingRoot = path.resolve(stagingRoot);
              if (
                !resolvedDestination.startsWith(`${resolvedStagingRoot}${path.sep}`) &&
                resolvedDestination !== resolvedStagingRoot
              ) {
                throw new BadRequestError("Invalid backup entry");
              }
              await mkdir(path.dirname(destination), { recursive: true });
              await pipeline(stream, (await import("fs")).createWriteStream(destination));
            }
            zipFile.readEntry();
          } catch (streamError) {
            reject(streamError);
          }
        });
      })();
    });

    zipFile.readEntry();
  });

  return {
    backup: backup!,
    stagingRoot,
  };
}

export async function parseBackupUpload(file: File): Promise<ParsedBackupUpload> {
  const extension = path.extname(file.name).toLowerCase();
  if (extension === ".json") {
    return {
      backup: parseBackupJson(await file.text()),
    };
  }

  if (extension !== ".zip") {
    throw new BadRequestError("JSON または ZIP のバックアップを選択してください");
  }

  const stagingRoot = path.join(IMPORT_STAGING_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  await mkdir(stagingRoot, { recursive: true });
  return extractZipBackup(Buffer.from(await file.arrayBuffer()), stagingRoot);
}

function reviveDate(value: unknown) {
  return value ? new Date(String(value)) : undefined;
}

function asBackupRecord(value: unknown, label: string): BackupRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError(`${label} の形式が不正です`);
  }
  return value as BackupRecord;
}

function requiredString(record: BackupRecord, key: string, label: string) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${label} が不正です`);
  }
  return value;
}

function stringWithDefault(record: BackupRecord, key: string, fallback = "") {
  const value = record[key];
  if (value == null) {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new BadRequestError(`${key} が不正です`);
  }
  return value;
}

function nullableString(record: BackupRecord, key: string) {
  const value = record[key];
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new BadRequestError(`${key} が不正です`);
  }
  return value;
}

function numberWithDefault(record: BackupRecord, key: string, fallback = 0) {
  const value = record[key];
  if (value == null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestError(`${key} が不正です`);
  }
  return value;
}

function booleanWithDefault(record: BackupRecord, key: string, fallback = false) {
  const value = record[key];
  if (value == null) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new BadRequestError(`${key} が不正です`);
  }
  return value;
}

function optionalDate(record: BackupRecord, key: string) {
  const value = record[key];
  if (value == null || value === "") {
    return undefined;
  }
  const date = reviveDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${key} が不正です`);
  }
  return date;
}

function nullableDate(record: BackupRecord, key: string) {
  const value = record[key];
  if (value == null || value === "") {
    return null;
  }
  const date = reviveDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${key} が不正です`);
  }
  return date;
}

function requiredDate(record: BackupRecord, key: string, label: string) {
  const date = optionalDate(record, key);
  if (!date) {
    throw new BadRequestError(`${label} が不正です`);
  }
  return date;
}

function toBankAccountCreateInput(item: unknown): Prisma.BankAccountUncheckedCreateInput {
  const record = asBackupRecord(item, "bank account");
  return {
    id: requiredString(record, "id", "bankAccounts.id"),
    bankName: requiredString(record, "bankName", "bankAccounts.bankName"),
    branchName: stringWithDefault(record, "branchName"),
    accountType: stringWithDefault(record, "accountType", "ordinary"),
    accountNumber: stringWithDefault(record, "accountNumber"),
    accountHolder: stringWithDefault(record, "accountHolder"),
    displayText: stringWithDefault(record, "displayText"),
    isDefault: booleanWithDefault(record, "isDefault"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toClientCreateInput(item: unknown): Prisma.ClientUncheckedCreateInput {
  const record = asBackupRecord(item, "client");
  return {
    id: requiredString(record, "id", "clients.id"),
    name: requiredString(record, "name", "clients.name"),
    clientType: stringWithDefault(record, "clientType", "corporate"),
    department: stringWithDefault(record, "department"),
    contactPerson: stringWithDefault(record, "contactPerson"),
    honorific: stringWithDefault(record, "honorific", "御中"),
    postalCode: stringWithDefault(record, "postalCode"),
    address: stringWithDefault(record, "address"),
    phone: stringWithDefault(record, "phone"),
    email: stringWithDefault(record, "email"),
    paymentTerms: stringWithDefault(record, "paymentTerms"),
    defaultSubject: stringWithDefault(record, "defaultSubject"),
    defaultNotes: stringWithDefault(record, "defaultNotes"),
    tags: stringWithDefault(record, "tags"),
    bankAccountId: nullableString(record, "bankAccountId"),
    isArchived: booleanWithDefault(record, "isArchived"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toProductCreateInput(item: unknown): Prisma.ProductUncheckedCreateInput {
  const record = asBackupRecord(item, "product");
  return {
    id: requiredString(record, "id", "products.id"),
    name: requiredString(record, "name", "products.name"),
    description: stringWithDefault(record, "description"),
    unitPrice: numberWithDefault(record, "unitPrice"),
    unit: stringWithDefault(record, "unit"),
    taxRate: numberWithDefault(record, "taxRate", 10),
    defaultQuantity: numberWithDefault(record, "defaultQuantity", 1),
    sortOrder: numberWithDefault(record, "sortOrder"),
    tags: stringWithDefault(record, "tags"),
    isArchived: booleanWithDefault(record, "isArchived"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toBusinessInfoCreateInput(item: unknown): Prisma.BusinessInfoUncheckedCreateInput {
  const record = asBackupRecord(item, "businessInfo");
  return {
    id: stringWithDefault(record, "id", "default"),
    businessName: stringWithDefault(record, "businessName"),
    tradeName: stringWithDefault(record, "tradeName"),
    representativeName: stringWithDefault(record, "representativeName"),
    postalCode: stringWithDefault(record, "postalCode"),
    address: stringWithDefault(record, "address"),
    phone: stringWithDefault(record, "phone"),
    email: stringWithDefault(record, "email"),
    invoiceRegistrationNo: stringWithDefault(record, "invoiceRegistrationNo"),
    logoPath: stringWithDefault(record, "logoPath"),
    sealPath: stringWithDefault(record, "sealPath"),
    defaultHonorific: stringWithDefault(record, "defaultHonorific", "御中"),
    defaultNotes: stringWithDefault(record, "defaultNotes"),
    taxCalculation: stringWithDefault(record, "taxCalculation", "exclusive"),
    roundingMethod: stringWithDefault(record, "roundingMethod", "floor"),
    defaultPaymentTerms: stringWithDefault(record, "defaultPaymentTerms"),
    defaultBankAccountId: nullableString(record, "defaultBankAccountId"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toAppSettingsCreateInput(item: unknown): Prisma.AppSettingsUncheckedCreateInput {
  const record = asBackupRecord(item, "appSettings");
  return {
    id: stringWithDefault(record, "id", "default"),
    showLogo: booleanWithDefault(record, "showLogo", true),
    showSeal: booleanWithDefault(record, "showSeal", true),
    defaultMarginTop: numberWithDefault(record, "defaultMarginTop", 10),
    defaultMarginRight: numberWithDefault(record, "defaultMarginRight", 10),
    defaultMarginBottom: numberWithDefault(record, "defaultMarginBottom", 10),
    defaultMarginLeft: numberWithDefault(record, "defaultMarginLeft", 10),
    showDeliveryDate: booleanWithDefault(record, "showDeliveryDate", true),
    showItemDate: booleanWithDefault(record, "showItemDate"),
    showItemMemo: booleanWithDefault(record, "showItemMemo"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toNumberSequenceCreateInput(item: unknown): Prisma.NumberSequenceUncheckedCreateInput {
  const record = asBackupRecord(item, "numberSequence");
  return {
    id: requiredString(record, "id", "numberSequences.id"),
    documentType: requiredString(record, "documentType", "numberSequences.documentType"),
    prefix: stringWithDefault(record, "prefix"),
    yearReset: booleanWithDefault(record, "yearReset", true),
    currentYear: numberWithDefault(record, "currentYear", new Date().getFullYear()),
    currentSeq: numberWithDefault(record, "currentSeq"),
    digits: numberWithDefault(record, "digits", 4),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toDocumentCreateInput(item: unknown): Prisma.DocumentUncheckedCreateInput {
  const record = asBackupRecord(item, "document");
  return {
    id: requiredString(record, "id", "documents.id"),
    documentType: requiredString(record, "documentType", "documents.documentType"),
    documentNumber: requiredString(record, "documentNumber", "documents.documentNumber"),
    status: stringWithDefault(record, "status", "draft"),
    issueDate: requiredDate(record, "issueDate", "documents.issueDate"),
    validUntil: nullableDate(record, "validUntil"),
    deliveryDate: nullableDate(record, "deliveryDate"),
    deliveryPlace: nullableString(record, "deliveryPlace"),
    paymentDueDate: nullableDate(record, "paymentDueDate"),
    bankAccountId: nullableString(record, "bankAccountId"),
    bankAccountText: stringWithDefault(record, "bankAccountText"),
    withholdingTax: booleanWithDefault(record, "withholdingTax"),
    withholdingAmount: numberWithDefault(record, "withholdingAmount"),
    receiptDate: nullableDate(record, "receiptDate"),
    addressee: nullableString(record, "addressee"),
    proviso: nullableString(record, "proviso"),
    paymentMethod: nullableString(record, "paymentMethod"),
    isReissue: booleanWithDefault(record, "isReissue"),
    showStampNotice: booleanWithDefault(record, "showStampNotice"),
    clientId: nullableString(record, "clientId"),
    clientDisplayName: stringWithDefault(record, "clientDisplayName"),
    clientDepartment: stringWithDefault(record, "clientDepartment"),
    clientContactName: stringWithDefault(record, "clientContactName"),
    clientHonorific: stringWithDefault(record, "clientHonorific", "御中"),
    clientAddress: stringWithDefault(record, "clientAddress"),
    subject: stringWithDefault(record, "subject"),
    notes: stringWithDefault(record, "notes"),
    internalMemo: stringWithDefault(record, "internalMemo"),
    tags: stringWithDefault(record, "tags"),
    subtotal: numberWithDefault(record, "subtotal"),
    taxAmount: numberWithDefault(record, "taxAmount"),
    totalAmount: numberWithDefault(record, "totalAmount"),
    pdfPath: stringWithDefault(record, "pdfPath"),
    sourceJson: stringWithDefault(record, "sourceJson"),
    sourceDocumentId: nullableString(record, "sourceDocumentId"),
    relatedDocIds: stringWithDefault(record, "relatedDocIds"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

function toDocumentItemCreateInput(item: unknown): Prisma.DocumentItemUncheckedCreateInput {
  const record = asBackupRecord(item, "documentItem");
  return {
    id: requiredString(record, "id", "documentItems.id"),
    documentId: requiredString(record, "documentId", "documentItems.documentId"),
    sortOrder: numberWithDefault(record, "sortOrder"),
    date: nullableDate(record, "date"),
    productName: stringWithDefault(record, "productName"),
    description: stringWithDefault(record, "description"),
    unitPrice: numberWithDefault(record, "unitPrice"),
    quantity: numberWithDefault(record, "quantity", 1),
    unit: stringWithDefault(record, "unit"),
    taxRate: numberWithDefault(record, "taxRate", 10),
    taxCategory: stringWithDefault(record, "taxCategory", "taxable_10"),
    amount: numberWithDefault(record, "amount"),
    memo: stringWithDefault(record, "memo"),
    createdAt: optionalDate(record, "createdAt"),
    updatedAt: optionalDate(record, "updatedAt"),
  };
}

export async function restoreBackupData(backup: BackupPayload) {
  const { data } = backup;

  await prisma.$transaction(async (tx) => {
    await tx.documentItem.deleteMany();
    await tx.document.deleteMany();
    await tx.numberSequence.deleteMany();
    await tx.appSettings.deleteMany();
    await tx.businessInfo.deleteMany();
    await tx.client.deleteMany();
    await tx.product.deleteMany();
    await tx.bankAccount.deleteMany();

    for (const item of data.bankAccounts) {
      await tx.bankAccount.create({
        data: toBankAccountCreateInput(item),
      });
    }

    for (const item of data.clients) {
      await tx.client.create({
        data: toClientCreateInput(item),
      });
    }

    for (const item of data.products) {
      await tx.product.create({
        data: toProductCreateInput(item),
      });
    }

    for (const item of data.businessInfo) {
      await tx.businessInfo.create({
        data: toBusinessInfoCreateInput(item),
      });
    }

    for (const item of data.appSettings) {
      await tx.appSettings.create({
        data: toAppSettingsCreateInput(item),
      });
    }

    for (const item of data.numberSequences) {
      await tx.numberSequence.create({
        data: toNumberSequenceCreateInput(item),
      });
    }

    for (const item of data.documents) {
      await tx.document.create({ data: toDocumentCreateInput(item) });
    }

    for (const item of data.documentItems) {
      await tx.documentItem.create({ data: toDocumentItemCreateInput(item) });
    }
  });
}

async function swapDirectory(stagingRoot: string, directoryName: "uploads" | "pdfs") {
  const stagedDir = path.join(stagingRoot, directoryName);
  const targetDir = path.join(DATA_DIR, directoryName);
  const backupDir = path.join(DATA_DIR, `.${directoryName}.pre-import-${Date.now()}`);

  await mkdir(stagedDir, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const hasCurrentDir = await pathExists(targetDir);
  if (hasCurrentDir) {
    await rename(targetDir, backupDir);
  }

  try {
    await rename(stagedDir, targetDir);
    if (hasCurrentDir) {
      await rm(backupDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (hasCurrentDir) {
      await rename(backupDir, targetDir);
    }
    throw error;
  }
}

export async function restoreBackupFiles(stagingRoot: string) {
  await swapDirectory(stagingRoot, "uploads");
  await swapDirectory(stagingRoot, "pdfs");
  await rm(stagingRoot, { recursive: true, force: true });
}
