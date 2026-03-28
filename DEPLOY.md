# デプロイ手順

変更をデプロイするには、以下のいずれかの方法で実行してください。

## 方法1: GitHub + Vercel（推奨）

既に Vercel にプロジェクトが接続されている場合：

1. **GitHub にプッシュ**
   ```powershell
   cd c:\Users\kiris\OneDrive\aiu_risyu
   git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
   git push -u origin master
   ```

2. Vercel が自動でビルド・デプロイします（数分かかります）

## 方法2: Vercel CLI で直接デプロイ

1. **Vercel CLI をインストール**（未導入の場合）
   ```powershell
   npm i -g vercel
   ```

2. **デプロイ**
   ```powershell
   cd c:\Users\kiris\OneDrive\aiu_risyu
   vercel --prod
   ```

   初回はログインやプロジェクト設定の確認が表示されます。

## 方法3: Vercel ダッシュボードから

1. [vercel.com](https://vercel.com) にログイン
2. プロジェクトを選択
3. 「Deployments」→「Redeploy」で再デプロイ
   - または、Git に接続済みなら GitHub にプッシュすると自動デプロイ

---

**注意**: Git は初期化済みで、変更はコミット済みです。あとはリモートにプッシュするか、Vercel CLI でデプロイするだけです。
