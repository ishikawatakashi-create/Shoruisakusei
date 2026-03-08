import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      businessInfo,
      clients,
      products,
      bankAccounts,
      documents,
      documentItems,
      numberSequences,
      appSettings,
    ] = await Promise.all([
      prisma.businessInfo.findMany(),
      prisma.client.findMany(),
      prisma.product.findMany(),
      prisma.bankAccount.findMany(),
      prisma.document.findMany(),
      prisma.documentItem.findMany(),
      prisma.numberSequence.findMany(),
      prisma.appSettings.findMany(),
    ]);

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
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
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (e) {
    console.error("Backup export error:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
