# sd-webui-danbooru-importer

[ English | [日本語](./README.ja.md) ]

sd-webui-danbooru-importer is an extension for Stable Diffusion WebUI Forge NEO that imports Danbooru tags into prompts.

## Features

- **Tag and Metadata Import**: Automatically imports tags, resolution, and metadata by simply entering a post URL or ID.
- **Automatic Tag Sorting**: Automatically sorts tags according to the recommended prompt category order for each model.
- **Automatic Resolution Adjustment**: Automatically sets the generation resolution to match the maximum resolution supported by each model while preserving the original aspect ratio.
- **Year Tag Generation**: Generates year tags (e.g., `year 2024`) based on the post date on Danbooru and inserts them into the prompt.

> [!NOTE]
> Some tags, particularly artist tags, may significantly influence generated images depending on the model and may result in outputs visually similar to existing works. Users are responsible for reviewing generated outputs and ensuring that their use and publication comply with applicable laws and the terms of relevant services.

## Demo

Coming Soon...

## Installation

### Method 1: Install via WebUI (recommended)

1. Open the **Extensions** tab and select the **Install from URL** tab.
2. Enter this repository URL in the **URL for extension's git repository** field:
   `https://github.com/datenn-si/sd-webui-danbooru-importer`
3. Click the **Install** button.
4. After installation is complete, go to the **Installed** tab and click **Apply and quit** to restart the WebUI.

### Method 2: Install directly with Git

1. Open a terminal (or command prompt) and move to the WebUI extensions folder.
2. Clone the repository.
3. Restart the WebUI.

```bash
cd <WebUI installation path>/extensions
git clone https://github.com/datenn-si/sd-webui-danbooru-importer.git
```

## Contributing

See the [Contributing Guide](./CONTRIBUTING.md) for detailed development setup and guidelines.

## To-Do

- [ ] Add presets for other anime-style models.
- [ ] Add a preview feature before inserting tags into the prompt fields.
- [ ] Categorize general tags into groups such as expressions, clothing, and poses, allowing users to choose which categories to import.

## Author

[Datenshi](https://github.com/datenn-si/)

## License

sd-webui-danbooru-importer is licensed under [MIT License](./LICENSE).
