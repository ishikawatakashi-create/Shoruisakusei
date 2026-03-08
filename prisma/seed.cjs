const { PrismaClient } = require(require("path").join(__dirname, "..", "node_modules", ".prisma", "client", "index.js"));

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
    create: { id: "default", showLogo: true, showSeal: true },
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
      bankName: "みずほ銀行", branchName: "丸の内支店", accountType: "ordinary",
      accountNumber: "1234567", accountHolder: "サンプル（カ",
      displayText: "みずほ銀行 丸の内支店 普通 1234567 サンプル（カ", isDefault: true,
    },
  });

  await prisma.businessInfo.update({
    where: { id: "default" },
    data: { defaultBankAccountId: bankAccount.id },
  });

  const client1 = await prisma.client.create({
    data: {
      name: "テスト商事株式会社", clientType: "corporate", department: "総務部",
      contactPerson: "鈴木 一郎", honorific: "御中", postalCode: "150-0001",
      address: "東京都渋谷区神宮前1-2-3", phone: "03-9876-5432",
      email: "suzuki@test-shoji.example.com", paymentTerms: "月末締め翌月末払い", tags: "主要取引先",
    },
  });

  await prisma.client.create({
    data: {
      name: "フリーランス 佐藤花子", clientType: "individual", contactPerson: "佐藤 花子",
      honorific: "様", postalCode: "160-0022", address: "東京都新宿区新宿2-3-4",
      phone: "090-1234-5678", email: "hanako@example.com", tags: "個人",
    },
  });

  const products = [
    // DX講義・研修
    { name: "DX講義（実施）", description: "営業会社向けDX研修の講義実施", unitPrice: 100000, unit: "時間", taxRate: 10, sortOrder: 1, tags: "講義,DX" },
    { name: "DX講義（半日研修）", description: "3〜4時間の半日研修プログラム", unitPrice: 300000, unit: "回", taxRate: 10, sortOrder: 2, tags: "講義,DX" },
    { name: "DX講義（終日研修）", description: "6〜7時間の終日研修プログラム", unitPrice: 500000, unit: "回", taxRate: 10, sortOrder: 3, tags: "講義,DX" },
    { name: "研修プログラム設計", description: "カリキュラム・研修内容の企画設計", unitPrice: 200000, unit: "式", taxRate: 10, sortOrder: 4, tags: "講義,DX" },
    { name: "講義資料作成", description: "スライド・配布資料の作成", unitPrice: 50000, unit: "時間", taxRate: 10, sortOrder: 5, tags: "講義,資料作成" },
    { name: "研修テキスト制作", description: "受講者向けテキスト・ワークブック制作", unitPrice: 150000, unit: "冊", taxRate: 10, sortOrder: 6, tags: "講義,資料作成" },
    // PR
    { name: "PRコンサルティング", description: "PR戦略の立案・助言", unitPrice: 80000, unit: "時間", taxRate: 10, sortOrder: 10, tags: "PR,コンサル" },
    { name: "PR戦略策定", description: "年間/四半期PR戦略の策定", unitPrice: 500000, unit: "式", taxRate: 10, sortOrder: 11, tags: "PR,コンサル" },
    { name: "PRライティング", description: "プレスリリース・PR記事の執筆", unitPrice: 50000, unit: "本", taxRate: 10, sortOrder: 12, tags: "PR,ライティング" },
    { name: "プレスリリース作成", description: "メディア配信用プレスリリース", unitPrice: 80000, unit: "本", taxRate: 10, sortOrder: 13, tags: "PR,ライティング" },
    { name: "メディアリレーション", description: "メディアへのアプローチ・関係構築", unitPrice: 100000, unit: "月", taxRate: 10, sortOrder: 14, tags: "PR" },
    { name: "PR月額顧問", description: "月次PRコンサルティング顧問契約", unitPrice: 300000, unit: "月", taxRate: 10, sortOrder: 15, tags: "PR,コンサル" },
    { name: "取材対応・メディアトレーニング", description: "取材準備・メディア対応の指導", unitPrice: 100000, unit: "回", taxRate: 10, sortOrder: 16, tags: "PR" },
    // Web・開発
    { name: "Webサイトデザイン", description: "レスポンシブ対応", unitPrice: 300000, unit: "式", taxRate: 10, sortOrder: 20, tags: "デザイン" },
    { name: "コーディング", description: "HTML/CSS/JS実装", unitPrice: 200000, unit: "式", taxRate: 10, sortOrder: 21, tags: "開発" },
    { name: "システム開発", description: "", unitPrice: 50000, unit: "人日", taxRate: 10, sortOrder: 22, tags: "開発" },
    // 資料・ドキュメント
    { name: "提案資料作成", description: "営業・提案用プレゼン資料", unitPrice: 50000, unit: "ページ", taxRate: 10, sortOrder: 30, tags: "資料作成" },
    { name: "企画書作成", description: "プロジェクト企画書の作成", unitPrice: 100000, unit: "式", taxRate: 10, sortOrder: 31, tags: "資料作成" },
    { name: "報告書作成", description: "活動報告・成果報告書", unitPrice: 80000, unit: "式", taxRate: 10, sortOrder: 32, tags: "資料作成" },
    // その他
    { name: "コンサルティング（一般）", description: "", unitPrice: 30000, unit: "時間", taxRate: 10, sortOrder: 40, tags: "コンサル" },
    { name: "ディレクション", description: "プロジェクト進行管理", unitPrice: 40000, unit: "時間", taxRate: 10, sortOrder: 41, tags: "ディレクション" },
    { name: "サーバー管理費", description: "月額保守費用", unitPrice: 10000, unit: "月", taxRate: 10, sortOrder: 50, tags: "保守" },
    { name: "交通費", description: "出張・移動にかかる交通費", unitPrice: 0, unit: "式", taxRate: 10, sortOrder: 90, tags: "経費" },
    { name: "その他経費", description: "", unitPrice: 0, unit: "式", taxRate: 10, sortOrder: 91, tags: "経費" },
  ];
  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  const estimate = await prisma.document.create({
    data: {
      documentType: "estimate", documentNumber: "EST-2026-0001", status: "issued",
      issueDate: new Date("2026-03-01"), validUntil: new Date("2026-03-31"),
      clientId: client1.id, clientDisplayName: "テスト商事株式会社",
      clientDepartment: "総務部", clientContactName: "鈴木 一郎",
      clientHonorific: "御中", clientAddress: "東京都渋谷区神宮前1-2-3",
      subject: "Webサイトリニューアル", notes: "有効期限内にご発注ください。",
      subtotal: 500000, taxAmount: 50000, totalAmount: 550000,
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
  console.log(`  - BankAccount: ${bankAccount.id}`);
  console.log(`  - Clients: 2`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Sample Estimate: ${estimate.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
