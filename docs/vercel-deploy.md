# Vercel デプロイで「常に古いコミットがビルドされる」場合の対処

ビルドログに **Commit: ec81a34** のように、プッシュした最新コミットではなく古いコミットが表示される場合の確認手順です。

## 原因

- 毎回「Redeploy」で**過去のデプロイ**を再実行している（そのデプロイが ec81a34 のとき、同じコミットが再度ビルドされる）
- Git 連携で **main の最新**がトリガーされていない（権限・接続の不備など）

## 対処手順

### 1. 最新の main から「新規デプロイ」する

1. [Vercel Dashboard](https://vercel.com/dashboard) → 対象プロジェクトを開く
2. **Deployments** タブを開く
3. 画面上部の **「Deploy」** または **「Redeploy」** で、**「Redeploy」** を選ぶ場合は **「Use existing Build Cache」のチェックを外す**
4. **どのコミットをデプロイするか**を確認する  
   - 「Redeploy」を**一覧のいちばん上（最新）のデプロイ**に対して行っているか確認  
   - 古いデプロイ行の「Redeploy」を押すと、そのときのコミット（例: ec81a34）が再度ビルドされる
5. **最新の main をデプロイしたい場合**は、**「Create Deployment」** や **「Deploy」** から **Branch: main** を選んで新規デプロイする（UI はプロジェクトにより異なります）

### 2. Git 連携の確認

1. **Settings** → **Git**
2. **Production Branch** が `main` になっているか確認
3. 接続リポジトリが `github.com/ishikawatakashi-create/Shoruisakusei` で正しいか確認

### 3. プッシュで自動デプロイされるようにする

1. [Vercel Account - Authentication](https://vercel.com/account/authentication) で、**Git ログイン連携**が有効か確認
2. 対象リポジトリへのアクセス権限が付与されているか確認（GitHub の Vercel アプリ設定）
3. **Private リポジトリ**の場合: コミット作者の Git ユーザーが、Vercel のチームメンバー（またはオーナー）と一致している必要があります

### 4. 手動で「main の最新」をデプロイする（CLI）

```bash
# リポジトリのルートで
npx vercel --prod
```

このコマンドは、**現在のローカルの main（または現在のブランチ）の内容**を本番にデプロイします。Git の履歴ではなく「今の作業ツリー」がデプロイ対象です。

---

**確認**: ビルドログの「Cloning ... (Branch: main, Commit: xxxxx)」で、**Commit が最新の main の SHA**（例: 124709e や 5950760）になっていれば、正しく最新がビルドされています。
