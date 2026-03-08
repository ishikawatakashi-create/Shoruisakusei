# 書類作成 - 帳票管理Webアプリ

個人利用のための帳票作成・管理Webアプリケーションです。  
見積書・納品書・請求書・領収書の作成、PDF発行、データ管理をローカル環境で完結できます。

## 機能一覧

### 帳票管理
- **4種類の帳票**: 見積書、納品書、請求書、領収書
- **作成・編集**: 左入力フォーム + 右リアルタイムプレビュー
- **一覧表示**: 検索、ステータス絞り込み、日付範囲フィルタ、並び替え
- **PDF発行**: A4縦の帳票PDFをPuppeteerで生成
- **複製**: 既存書類から新規作成
- **帳票間変換**: 見積書→納品書/請求書、納品書→請求書、請求書→領収書
- **ステータス管理**: 下書き、発行済み、送付済み、入金済み、アーカイブ

### マスタ管理
- **事業者設定**: 発行者情報、ロゴ、印影、消費税設定、端数処理
- **取引先マスタ**: 法人/個人、部署、担当者、住所、支払条件
- **品目マスタ**: 品目名、単価、単位、税率、タグ
- **振込先マスタ**: 銀行名、口座情報、デフォルト設定

### 帳票機能
- **消費税**: 複数税率対応（10%/8%/非課税/対象外）、税額内訳表示
- **端数処理**: 切り捨て / 切り上げ / 四捨五入
- **源泉徴収**: 請求書で任意ON（自動計算）
- **採番**: 自動採番（EST-2026-0001形式）、接頭辞変更可能
- **適格請求書**: 登録番号の表示

### データ管理
- **バックアップ**: JSONエクスポート/インポート
- **SQLiteデータベース**: ローカルファイル保存
- **PDFファイル**: data/pdfs/ に保存

## 技術スタック

| 技術 | 用途 |
|------|------|
| Next.js 15 (App Router) | フレームワーク |
| TypeScript | 型安全性 |
| Tailwind CSS v4 | スタイリング |
| shadcn/ui (Radix UI) | UIコンポーネント |
| Prisma | ORM |
| SQLite | データベース |
| React Hook Form + Zod | フォーム/バリデーション |
| Puppeteer | PDF生成 |
| Sonner | トースト通知 |
| Lucide React | アイコン |

## セットアップ手順

### 前提条件
- Node.js 20以上
- npm

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データベースのセットアップ

```bash
npx prisma db push
```

### 3. サンプルデータの投入（任意）

```bash
node prisma/seed.cjs
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

### ワンライナーセットアップ

```bash
npm run setup
```

## ディレクトリ構成

```
├── app/                    # Next.js App Router
│   ├── api/                # APIルート
│   │   ├── documents/      # 帳票CRUD
│   │   ├── clients/        # 取引先CRUD
│   │   ├── products/       # 品目CRUD
│   │   ├── bank-accounts/  # 振込先CRUD
│   │   ├── settings/       # 設定
│   │   ├── backup/         # バックアップ
│   │   └── upload/         # ファイルアップロード
│   ├── estimates/          # 見積書ページ
│   ├── delivery-notes/     # 納品書ページ
│   ├── invoices/           # 請求書ページ
│   ├── receipts/           # 領収書ページ
│   ├── clients/            # 取引先管理
│   ├── products/           # 品目管理
│   ├── bank-accounts/      # 振込先管理
│   └── settings/           # 設定ページ
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   ├── layout/             # サイドバー、ヘッダー
│   └── documents/          # 帳票共通コンポーネント
├── lib/                    # ユーティリティ
├── services/               # ビジネスロジック層
├── repositories/           # データアクセス層
├── types/                  # TypeScript型定義
├── prisma/                 # Prisma設定
│   ├── schema.prisma       # DBスキーマ
│   └── seed.cjs            # シードデータ
├── data/                   # ローカルデータ
│   ├── pdfs/               # 生成PDFの保存先
│   └── uploads/            # アップロードファイル
└── scripts/                # ユーティリティスクリプト
```

## 画面一覧

| 画面 | URL | 概要 |
|------|-----|------|
| ダッシュボード | `/` | 概要、最近の書類 |
| 見積書一覧 | `/estimates` | 検索、フィルタ、一括操作 |
| 見積書作成 | `/estimates/new` | 左入力/右プレビュー |
| 見積書編集 | `/estimates/[id]/edit` | 自動保存対応 |
| 納品書一覧 | `/delivery-notes` | |
| 納品書作成 | `/delivery-notes/new` | |
| 請求書一覧 | `/invoices` | |
| 請求書作成 | `/invoices/new` | |
| 領収書一覧 | `/receipts` | |
| 領収書作成 | `/receipts/new` | |
| 取引先管理 | `/clients` | CRUD |
| 品目管理 | `/products` | CRUD |
| 振込先管理 | `/bank-accounts` | CRUD |
| 事業者設定 | `/settings/business` | 発行者情報 |
| データ管理 | `/settings/backup` | バックアップ/復元 |

## 将来の拡張ポイント

### SQLite → PostgreSQL / Supabase への移行

1. **Prisma schema** の `provider` を `"postgresql"` に変更
2. `.env` の `DATABASE_URL` をPostgreSQL接続文字列に変更
3. `prisma migrate dev` で新しいマイグレーションを作成
4. repository層はPrismaを通じてアクセスしているため、アプリコードの変更は最小限

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 認証の追加

1. **NextAuth.js** または **Supabase Auth** を追加
2. `middleware.ts` でルート保護
3. 各APIルートに認証チェックを追加
4. Documentモデルに `userId` フィールドを追加（マルチテナント化）

### その他の拡張
- **メール送付**: Resend/SendGrid連携
- **クラウドストレージ**: Supabase Storage / S3 でPDF保管
- **定期請求**: 月次自動生成
- **ダッシュボード強化**: グラフ、売上集計

## 注意事項

- 日本語パスの環境では `scripts/patch-prisma.cjs` が自動的にPrismaクライアントをパッチします
- PDF生成にはPuppeteerを使用しており、初回実行時にChromiumがダウンロードされます
- ローカル利用を前提としており、インターネット公開には認証の追加が必要です

## ライセンス

Private - 個人利用
