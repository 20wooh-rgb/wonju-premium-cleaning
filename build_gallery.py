#!/usr/bin/env python3
"""
Wonju Premium Cleaning - gallery builder
- Put new images into: incoming/<category>/
  e.g. incoming/물류센터 전경(추가 예정)/myphoto.jpg
- Run: python build_gallery.py
This will:
  1) Copy/resize into images/full and images/thumb
  2) Update data/gallery.json
"""
import os, json, re, unicodedata, hashlib
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
INCOMING = os.path.join(ROOT, "incoming")
FULL_DIR = os.path.join(ROOT, "images", "full")
THUMB_DIR = os.path.join(ROOT, "images", "thumb")
DATA_PATH = os.path.join(ROOT, "data", "gallery.json")

def slugify(name: str) -> str:
    stem, ext = os.path.splitext(name)
    s = unicodedata.normalize("NFKD", stem)
    s = re.sub(r"[^\w\-]+", "_", s, flags=re.UNICODE)
    s = re.sub(r"_+", "_", s).strip("_") or "img"
    return s + ext.lower()

def process(src: str, dest_full: str, dest_thumb: str, max_full=2400, thumb_max=700):
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)

    w, h = im.size
    scale = min(1.0, max_full / max(w, h))
    if scale < 1.0:
        im_full = im.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
    else:
        im_full = im
    os.makedirs(os.path.dirname(dest_full), exist_ok=True)
    im_full.save(dest_full, quality=88, optimize=True)

    w, h = im_full.size
    scale = min(1.0, thumb_max / max(w, h))
    im_thumb = im_full.resize((int(w*scale), int(h*scale)), Image.LANCZOS) if scale < 1.0 else im_full.copy()
    os.makedirs(os.path.dirname(dest_thumb), exist_ok=True)
    im_thumb.save(dest_thumb, quality=82, optimize=True)

def main():
    os.makedirs(FULL_DIR, exist_ok=True)
    os.makedirs(THUMB_DIR, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)

    items = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            items = json.load(f).get("items", [])

    seen = set((it.get("category"), it.get("file")) for it in items)

    if not os.path.isdir(INCOMING):
        os.makedirs(INCOMING, exist_ok=True)
        print("Created incoming/ folder. Put new images into incoming/<category>/ and re-run.")
        return

    added = 0
    for category in sorted(os.listdir(INCOMING)):
        cat_dir = os.path.join(INCOMING, category)
        if not os.path.isdir(cat_dir):
            continue
        for fname in sorted(os.listdir(cat_dir)):
            if not re.search(r"\.(jpg|jpeg|png|webp)$", fname, re.I):
                continue
            src = os.path.join(cat_dir, fname)
            slug = slugify(fname)
            # avoid collisions
            if any(it.get("file")==slug for it in items):
                h = hashlib.md5((category + "/" + fname).encode("utf-8")).hexdigest()[:6]
                stem, ext = os.path.splitext(slug)
                slug = f"{stem}_{h}{ext}"
            key = (category, slug)
            if key in seen:
                continue

            dest_full = os.path.join(FULL_DIR, slug)
            dest_thumb = os.path.join(THUMB_DIR, slug)
            process(src, dest_full, dest_thumb)
            items.append({"category": category, "file": slug, "title": os.path.splitext(fname)[0]})
            seen.add(key)
            added += 1

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump({"items": items}, f, ensure_ascii=False, indent=2)

    print(f"Done. Added {added} image(s).")
    print("Tip: When you add 물류센터 전경 사진, put them into incoming/물류센터 전경(추가 예정)/")

if __name__ == "__main__":
    main()
