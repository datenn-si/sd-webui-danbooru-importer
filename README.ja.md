# sd-webui-danbooru-importer

[ [English](./README.md) | 日本語 ]

sd-webui-danbooru-importer は Danbooru タグをプロンプトにインポートする Stable Diffusion WebUI Forge NEO 向けの拡張機能です。

## 機能

- **タグやメタデータのインポート**: 作品URLまたは投稿IDを入力するだけで、タグ、解像度、メタデータを自動でインポートします。
- **タグの自動並び替え**: モデルごとのプロンプトカテゴリの推奨順序に自動で並び替えます。
- **自動での解像度反映**: アスペクト比を維持したまま、長辺を各種モデルの最大解像度に合わせて自動で生成解像度を反映できます。
- **作成年（Year）タグ生成**: Danbooru への投稿日をもとに年代タグ（`year 2024` など）を作成しプロンプトに挿入することができます。

> [!NOTE]
> 一部のタグ、特にアーティストタグは、使用するモデルによっては生成される画像に大きな影響を与え、既存の作品と視覚的に類似した結果が生成される可能性があります。ユーザーは生成された結果を確認し、その使用および公開が、適用される法律および関連サービスの利用規約に準拠していることを確認する責任を負います。

## デモ

Coming Soon...

## インストール

### 方法1: WebUI経由でインストール（推奨）

1. **Extensions** タブを開き、**Install from URL** タブを選択します。
2. **URL for extension's git repository** の入力欄に、このリポジトリのURLを入力します:
   `https://github.com/datenn-si/sd-webui-danbooru-importer`
3. **Install** ボタンを押します。
4. インストール完了後、**Installed** タブに移動し、**Apply and quit** を押してWebUIを再起動します。

### 方法2: Gitコマンドで直接インストール

1. ターミナル（またはコマンドプロンプト）を開き、WebUIの拡張機能フォルダへ移動します。
2. リポジトリをクローンします。
3. WebUIを再起動します。

```bash
cd <WebUIのインストールパス>/extensions
git clone https://github.com/datenn-si/sd-webui-danbooru-importer.git
```

## 貢献する

[Contributing Guide](./CONTRIBUTING.ja.md) で詳細な開発環境のセットアップ方法及びガイドラインを確認してください。

## To-Do

- [ ] ほかのアニメ調モデルのプリセットを追加する。
- [ ] プロンプト欄に書き込む前にプレビューできるようにする。
- [ ] 一般タグも表情、服装、ポーズといったようにカテゴリ分けしてインポートするか選択できるようにする。

## 作者

[だてんし](https://github.com/datenn-si/)

## License

sd-webui-danbooru-importer は [MIT License](./LICENSE) の下で提供されています。
