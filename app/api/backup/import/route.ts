import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();

    if (!backup.data) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const { data } = backup;

    // Clear existing data in correct order (respecting foreign keys)
    await prisma.documentItem.deleteMany();
    await prisma.document.deleteMany();
    await prisma.numberSequence.deleteMany();
    await prisma.appSettings.deleteMany();
    await prisma.businessInfo.deleteMany();
    await prisma.client.deleteMany();
    await prisma.product.deleteMany();
    await prisma.bankAccount.deleteMany();

    // Re-insert data
    if (data.bankAccounts?.length) {
      for (const item of data.bankAccounts) {
        await prisma.bankAccount.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.clients?.length) {
      for (const item of data.clients) {
        await prisma.client.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.products?.length) {
      for (const item of data.products) {
        await prisma.product.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.businessInfo?.length) {
      for (const item of data.businessInfo) {
        await prisma.businessInfo.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.appSettings?.length) {
      for (const item of data.appSettings) {
        await prisma.appSettings.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.numberSequences?.length) {
      for (const item of data.numberSequences) {
        await prisma.numberSequence.create({ data: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) } });
      }
    }

    if (data.documents?.length) {
      for (const item of data.documents) {
        const docData = { ...item };
        delete docData.items;
        const dateFields = ["issueDate", "validUntil", "deliveryDate", "paymentDueDate", "receiptDate", "createdAt", "updatedAt"];
        for (const f of dateFields) {
          if (docData[f]) docData[f] = new Date(docData[f]);
        }
        await prisma.document.create({ data: docData });
      }
    }

    if (data.documentItems?.length) {
      for (const item of data.documentItems) {
        const itemData = { ...item };
        if (itemData.date) itemData.date = new Date(itemData.date);
        itemData.createdAt = new Date(itemData.createdAt);
        itemData.updatedAt = new Date(itemData.updatedAt);
        await prisma.documentItem.create({ data: itemData });
      }
    }

    return NextResponse.json({ success: true, message: "Import completed" });
  } catch (e) {
    console.error("Backup import error:", e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
