import glob
import json
import os
import re

import requests  # pyright: ignore[reportMissingModuleSource]

from fastapi import Request  # pyright: ignore[reportMissingImports]
from fastapi.responses import JSONResponse  # pyright: ignore[reportMissingImports]
from modules import script_callbacks  # pyright: ignore[reportMissingImports]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRESETS_DIR = os.path.join(BASE_DIR, "model_presets")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
LOCALES_DIR = os.path.join(BASE_DIR, "locales")

DEFAULT_CONFIG = {
    "selected_model": "Anima/Anima",
    "language": "auto",
    "categories": {
        "recommended": True,
        "rating": True,
        "year": True,
        "copyright": True,
        "character": True,
        "count_gender": True,
        "artist": True,
        "general": True,
        "meta": True,
    },
    "apply_resolution": True,
    "apply_sort_order": True,
}


def load_json_file(path, default):
    try:
        with open(path, encoding="utf-8") as file_handle:
            return json.load(file_handle)
    except Exception:
        return default


def load_presets():
    presets = {}
    pattern = os.path.join(PRESETS_DIR, "*", "*.json")
    for path in sorted(glob.glob(pattern)):
        data = load_json_file(path, None)
        if not isinstance(data, dict):
            continue
        category = os.path.basename(os.path.dirname(path))
        name = os.path.splitext(os.path.basename(path))[0]
        data["category"] = category
        data["name"] = name
        presets[f"{category}/{name}"] = data
    default_model = next(iter(presets), "")
    return {"presets": presets, "default_model": default_model}


def load_config():
    return load_json_file(CONFIG_PATH, DEFAULT_CONFIG)


def save_config(data):
    with open(CONFIG_PATH, "w", encoding="utf-8") as file_handle:
        json.dump(data, file_handle, indent=2, ensure_ascii=False)


def load_locales():
    result = {}
    if not os.path.isdir(LOCALES_DIR):
        return result
    for name in sorted(os.listdir(LOCALES_DIR)):
        if not name.endswith(".json"):
            continue
        data = load_json_file(os.path.join(LOCALES_DIR, name), None)
        if isinstance(data, dict):
            result[os.path.splitext(name)[0]] = data
    return result


def extract_post_id(query):
    query = (query or "").strip()
    if not query:
        return None
    match = re.search(r"/posts/(\d+)", query)
    if match:
        return match.group(1)
    if query.isdigit():
        return query
    match = re.search(r"(\d+)", query)
    if match:
        return match.group(1)
    return None


def round_to_multiple(value, step):
    if step <= 0:
        return int(round(value))
    return int(round(value / step) * step)


def compute_resolution(width, height, min_res, max_res, step):
    if not width or not height:
        return max_res, max_res

    if width >= height:
        scale = max_res / width
        new_width = max_res
        new_height = height * scale
        if new_height < min_res:
            scale = min_res / height
            new_height = min_res
            new_width = width * scale
            if new_width > max_res:
                new_width = max_res
    else:
        scale = max_res / height
        new_height = max_res
        new_width = width * scale
        if new_width < min_res:
            scale = min_res / width
            new_width = min_res
            new_height = height * scale
            if new_height > max_res:
                new_height = max_res

    new_width = round_to_multiple(new_width, step)
    new_height = round_to_multiple(new_height, step)
    new_width = max(min_res, min(max_res, new_width))
    new_height = max(min_res, min(max_res, new_height))
    return new_width, new_height


def escape_parentheses(tag):
    return tag.replace("(", "\\(").replace(")", "\\)")


def split_tag_string(raw):
    if not raw:
        return []
    return [escape_parentheses(tag.replace("_", " ")) for tag in raw.split() if tag]


def format_year(created_at, year_format):
    match = re.match(r"^(\d{4})", str(created_at or ""))
    if not match:
        return ""
    template = year_format or "{year}"
    return template.replace("{year}", match.group(1))


def process_post(data, preset):
    rating_map = preset.get("rating_map", {})
    artist_prefix = preset.get("artist_prefix", "")
    count_pattern = preset.get("count_tag_pattern", "")
    pattern = re.compile(count_pattern) if count_pattern else None

    general_tags = split_tag_string(data.get("tag_string_general", ""))
    character_tags = split_tag_string(data.get("tag_string_character", ""))
    copyright_tags = split_tag_string(data.get("tag_string_copyright", ""))
    meta_tags = split_tag_string(data.get("tag_string_meta", ""))
    artist_tags = [
        f"{artist_prefix}{tag}" for tag in split_tag_string(data.get("tag_string_artist", ""))
    ]

    count_gender_tags = []
    filtered_general = []
    for tag in general_tags:
        lookup_tag = tag.replace(" ", "_")
        if pattern and pattern.match(lookup_tag):
            count_gender_tags.append(tag)
        else:
            filtered_general.append(tag)

    rating_tag = rating_map.get(data.get("rating", ""), "")
    year_tag = format_year(data.get("created_at", ""), preset.get("year_format", "{year}"))
    recommended = preset.get("recommended_prompts", "")

    source_width = data.get("image_width", 0) or 0
    source_height = data.get("image_height", 0) or 0
    resolution = preset.get("resolution", {})
    min_res = resolution.get("min", 512)
    max_res = resolution.get("max", 1536)
    step = resolution.get("step", 64)
    final_width, final_height = compute_resolution(
        source_width, source_height, min_res, max_res, step
    )

    return {
        "recommended": recommended,
        "rating": rating_tag,
        "year": year_tag,
        "copyright": ", ".join(copyright_tags),
        "character": ", ".join(character_tags),
        "count_gender": ", ".join(count_gender_tags),
        "artist": ", ".join(artist_tags),
        "general": ", ".join(filtered_general),
        "meta": ", ".join(meta_tags),
        "width": final_width,
        "height": final_height,
        "source_width": source_width,
        "source_height": source_height,
    }


def error_response(code, message):
    return JSONResponse({"success": False, "error_code": code, "error": message})


def register_routes(app):
    @app.get("/danbooru_importer/presets")
    async def danbooru_importer_get_presets():
        return JSONResponse(load_presets())

    @app.get("/danbooru_importer/config")
    async def danbooru_importer_get_config():
        return JSONResponse(load_config())

    @app.post("/danbooru_importer/config")
    async def danbooru_importer_save_config(request: Request):
        body = await request.json()
        save_config(body)
        return JSONResponse({"success": True})

    @app.get("/danbooru_importer/locales")
    async def danbooru_importer_get_locales():
        return JSONResponse({"locales": load_locales(), "fallback": "en"})

    @app.post("/danbooru_importer/fetch")
    async def danbooru_importer_fetch(request: Request):
        body = await request.json()
        query = body.get("query", "")
        model_name = body.get("model", "")

        presets = load_presets()
        preset = presets.get("presets", {}).get(model_name)
        if not preset:
            return error_response("preset_not_found", "Model preset not found")

        post_id = extract_post_id(query)
        if not post_id:
            return error_response("invalid_input", "Invalid Danbooru URL or Post ID")

        target_url = f"https://danbooru.donmai.us/posts/{post_id}.json"
        try:
            response = requests.get(
                target_url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SDWebUIDanbooruImporter/1.0)"},
                timeout=15,
            )
            response.raise_for_status()
            post_data = response.json()
        except Exception as error:
            return error_response("request_failed", str(error))

        if not isinstance(post_data, dict) or "id" not in post_data:
            return error_response("post_not_found", "Post not found")

        processed = process_post(post_data, preset)
        return JSONResponse({"success": True, "data": processed})


def on_app_started(demo, app):
    register_routes(app)


script_callbacks.on_app_started(on_app_started)
