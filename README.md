# KIKAMOYO

ブラウザ上で幾何学模様を作成し、PNG・SVG・CSS・JSON・WebMへ書き出せるパターンジェネレーターです。

公開サイト: <https://tetoriapot.github.io/kikamoyo/>

## 開発

```bash
pnpm install
pnpm dev
```

テストは `pnpm test`、本番ビルドは `pnpm build` で実行できます。

## GitHub Pages版について

GitHub Pages版では、プロジェクトと表示設定をブラウザ内に保存します。別端末への移行やバックアップにはプロジェクト管理画面のJSON入出力を利用してください。

`main` ブランチへのpushで `.github/workflows/pages.yml` が静的サイトをビルドし、GitHub Pagesへ公開します。
