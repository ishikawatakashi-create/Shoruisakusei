import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  await prisma.businessInfo.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "サンプル株式会社",
      tradeName: "",
      representativeName: "山田 太郎",
      postalCode: "100-0001",
      address: "東京都千代田区千代田1-1-1 サンプルビル3F",
      phone: "03-1234-5678",
      email: "info@sample-corp.example.com",
      invoiceRegistrationNo: "T1234567890123",
      defaultHonorific: "御中",
      defaultNotes: "お支払いは請求書記載の期日までにお願いいたします。",
      taxCalculation: "exclusive",
      roundingMethod: "floor",
      defaultPaymentTerms: "月末締め翌月末払い",
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      showLogo: true,
      showSeal: true,
    },
  });

  const sequences = [
    { documentType: "estimate", prefix: "EST", currentYear: 2026, currentSeq: 0, digits: 4 },
    { documentType: "delivery_note", prefix: "DEL", currentYear: 2026, currentSeq: 0, digits: 4 },
    { documentType: "invoice", prefix: "INV", currentYear: 2026, currentSeq: 0, digits: 4 },
    { documentType: "receipt", prefix: "REC", currentYear: 2026, currentSeq: 0, digits: 4 },
  ];
  for (const seq of sequences) {
    await prisma.numberSequence.upsert({
      where: { documentType: seq.documentType },
      update: {},
      create: seq,
    });
  }

  const bankAccount = await prisma.bankAccount.create({
    data: {
      bankName: "みずほ銀行",
      branchName: "丸の内支店",
      accountType: "ordinary",
      accountNumber: "1234567",
      accountHolder: "サンプル（カ",
      displayText: "みずほ銀行 丸の内支店 普通 1234567 サンプル（カ",
      isDefault: true,
    },
  });

  await prisma.businessInfo.update({
    where: { id: "default" },
    data: { defaultBankAccountId: bankAccount.id },
  });

  const client1 = await prisma.client.create({
    data: {
      name: "テスト商事株式会社",
      clientType: "corporate",
      department: "総務部",
      contactPerson: "鈴木 一郎",
      honorific: "御中",
      postalCode: "150-0001",
      address: "東京都渋谷区神宮前1-2-3",
      phone: "03-9876-5432",
      email: "suzuki@test-shoji.example.com",
      paymentTerms: "月末締め翌月末払い",
      defaultSubject: "",
      tags: "主要取引先",
    },
  });

  await prisma.client.create({
    data: {
      name: "フリーランス 佐藤花子",
      clientType: "individual",
      contactPerson: "佐藤 花子",
      honorific: "様",
      postalCode: "160-0022",
      address: "東京都新宿区新宿2-3-4",
      phone: "090-1234-5678",
      email: "hanako@example.com",
      tags: "個人",
    },
  });

  const products = [
    { name: "Webサイトデザイン", description: "レスポンシブ対応", unitPrice: 300000, unit: "式", taxRate: 10, sortOrder: 1, tags: "デザイン" },
    { name: "コーディング", description: "HTML/CSS/JS実装", unitPrice: 200000, unit: "式", taxRate: 10, sortOrder: 2, tags: "開発" },
    { name: "システム開発", description: "", unitPrice: 50000, unit: "人日", taxRate: 10, sortOrder: 3, tags: "開発" },
    { name: "コンサルティング", description: "", unitPrice: 30000, unit: "時間", taxRate: 10, sortOrder: 4, tags: "コンサル" },
    { name: "サーバー管理費", description: "月額保守費用", unitPrice: 10000, unit: "月", taxRate: 10, sortOrder: 5, tags: "保守" },
  ];
  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  const estimate = await prisma.document.create({
    data: {
      documentType: "estimate",
      documentNumber: "EST-2026-0001",
      status: "issued",
      issueDate: new Date("2026-03-01"),
      validUntil: new Date("2026-03-31"),
      clientId: client1.id,
      clientDisplayName: "テスト商事株式会社",
      clientDepartment: "総務部",
      clientContactName: "鈴木 一郎",
      clientHonorific: "御中",
      clientAddress: "東京都渋谷区神宮前1-2-3",
      subject: "Webサイトリニューアル",
      notes: "有効期限内にご発注ください。",
      subtotal: 500000,
      taxAmount: 50000,
      totalAmount: 550000,
      items: {
        create: [
          { sortOrder: 1, productName: "Webサイトデザイン", description: "トップページ + 下層5P", unitPrice: 300000, quantity: 1, unit: "式", taxRate: 10, taxCategory: "taxable_10", amount: 300000 },
          { sortOrder: 2, productName: "コーディング", description: "HTML/CSS/JS レスポンシブ対応", unitPrice: 200000, quantity: 1, unit: "式", taxRate: 10, taxCategory: "taxable_10", amount: 200000 },
        ],
      },
    },
  });

  await prisma.numberSequence.update({
    where: { documentType: "estimate" },
    data: { currentSeq: 1 },
  });

  console.log("Seed data created successfully!");
  console.log(`  - BusinessInfo: default`);
  console.log(`  - BankAccount: ${bankAccount.id}`);
  console.log(`  - Clients: 2`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Sample Estimate: ${estimate.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
