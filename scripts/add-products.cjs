const { PrismaClient } = require(require("path").join(__dirname, "..", "node_modules", ".prisma", "client", "index.js"));
const prisma = new PrismaClient();

const newProducts = [
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
  // 資料・ドキュメント
  { name: "提案資料作成", description: "営業・提案用プレゼン資料", unitPrice: 50000, unit: "ページ", taxRate: 10, sortOrder: 30, tags: "資料作成" },
  { name: "企画書作成", description: "プロジェクト企画書の作成", unitPrice: 100000, unit: "式", taxRate: 10, sortOrder: 31, tags: "資料作成" },
  { name: "報告書作成", description: "活動報告・成果報告書", unitPrice: 80000, unit: "式", taxRate: 10, sortOrder: 32, tags: "資料作成" },
  // その他
  { name: "ディレクション", description: "プロジェクト進行管理", unitPrice: 40000, unit: "時間", taxRate: 10, sortOrder: 41, tags: "ディレクション" },
  { name: "交通費", description: "出張・移動にかかる交通費", unitPrice: 0, unit: "式", taxRate: 10, sortOrder: 90, tags: "経費" },
  { name: "その他経費", description: "", unitPrice: 0, unit: "式", taxRate: 10, sortOrder: 91, tags: "経費" },
];

async function main() {
  // 既存の品目名を取得して重複を防ぐ
  const existing = await prisma.product.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(p => p.name));

  let added = 0;
  for (const p of newProducts) {
    if (!existingNames.has(p.name)) {
      await prisma.product.create({ data: p });
      added++;
      console.log(`  + ${p.name}`);
    } else {
      console.log(`  (skip) ${p.name} - 既に存在`);
    }
  }
  console.log(`\n${added}件の品目を追加しました（既存${existing.length}件 → 合計${existing.length + added}件）`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
