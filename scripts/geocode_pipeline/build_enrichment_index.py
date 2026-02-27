#!/usr/bin/env python3
"""
ENRICHMENT INDEX BUILDER — Pre-processes all contextual data into fast-lookup structures.
Loads constituencies_with_centroids.geojson, healthcare_facilities.geojson, KE.txt (GeoNames),
hospital CSVs, and builds a single enrichment_index.json for the geocoder.
"""
import json
import csv
import re
import math
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline")
DATA_DIR = BASE_DIR / "data" / "processed"

CENTROIDS_FILE = DATA_DIR / "constituencies_with_centroids.geojson"
HEALTHCARE_FILE = DATA_DIR / "healthcare_facilities.geojson"
GEONAMES_FILE = DATA_DIR / "KE.txt"
HOSPITALS_CSV = DATA_DIR / "kenya_hospitals.csv"
PHARMACIES_CSV = DATA_DIR / "kenya_pharmacies.csv"
COMMUNITY_HEALTH_CSV = DATA_DIR / "kenya_community_health.csv"
OUTPUT_FILE = DATA_DIR / "enrichment_index.json"


def normalize_name(name):
    """Ultra-robust name normalizer handling hyphens, apostrophes, slashes, spacing, typos."""
    if not name:
        return ""
    n = str(name).strip()
    n = n.upper()
    n = re.sub(r"[''`\u2018\u2019\u201C\u201D]", "", n)
    n = re.sub(r"[-/\\]", " ", n)
    n = re.sub(r"[^A-Z0-9\s]", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def load_constituency_centroids():
    """Load 295 constituency centroids from GeoJSON."""
    print(f"Loading constituency centroids from {CENTROIDS_FILE}...")
    centroids = {}
    name_variants = {}

    with open(CENTROIDS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        raw_name = props.get("constituency_name", "")
        if not raw_name:
            continue
        raw_name = str(raw_name)
        county = str(props.get("county", "") or "")
        lat = props.get("latitude")
        lon = props.get("longitude")
        code = props.get("constituency_code")

        if lat is None or lon is None:
            geom = feat.get("geometry", {})
            if geom.get("type") == "Polygon":
                coords = geom["coordinates"][0]
                lat = sum(c[1] for c in coords) / len(coords)
                lon = sum(c[0] for c in coords) / len(coords)
            elif geom.get("type") == "MultiPolygon":
                all_coords = []
                for poly in geom["coordinates"]:
                    all_coords.extend(poly[0])
                lat = sum(c[1] for c in all_coords) / len(all_coords)
                lon = sum(c[0] for c in all_coords) / len(all_coords)

        if lat is not None and lon is not None:
            normalized = normalize_name(raw_name)
            entry = {
                "name": raw_name,
                "normalized": normalized,
                "county": county,
                "lat": float(lat),
                "lon": float(lon),
                "code": code,
            }
            centroids[normalized] = entry
            name_variants[raw_name.upper()] = normalized
            name_variants[raw_name.lower()] = normalized
            name_variants[raw_name.title()] = normalized
            name_variants[normalized] = normalized

            parts = normalized.split()
            if len(parts) > 1:
                no_spaces = "".join(parts)
                name_variants[no_spaces] = normalized
                name_variants[" ".join(parts[::-1])] = normalized

    print(f"  Loaded {len(centroids)} constituency centroids with {len(name_variants)} name variants.")
    return centroids, name_variants


def load_healthcare_facilities():
    """Load 10K+ healthcare facilities grouped by constituency."""
    print(f"Loading healthcare facilities from {HEALTHCARE_FILE}...")
    by_constituency = defaultdict(list)
    total = 0

    with open(HEALTHCARE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        name = props.get("name", "")
        ftype = props.get("type", "")
        constituency = props.get("constituency", "")
        county = props.get("county", "")
        subcounty = props.get("subcounty", "")
        nearest_to = props.get("nearest_to", "")

        lat = props.get("latitude.1") or props.get("latitude")
        lon = props.get("longitude.1") or props.get("longitude")

        if lat is None or lon is None:
            if geom.get("type") == "Point" and geom.get("coordinates"):
                lon, lat = geom["coordinates"]

        if lat is not None and lon is not None:
            normalized_const = normalize_name(constituency)
            entry = {
                "name": name,
                "type": ftype,
                "lat": float(lat),
                "lon": float(lon),
                "county": county,
                "subcounty": subcounty,
                "nearest_to": nearest_to,
                "normalized_name": normalize_name(name),
            }
            by_constituency[normalized_const].append(entry)
            total += 1

    print(f"  Loaded {total} healthcare facilities across {len(by_constituency)} constituencies.")
    return dict(by_constituency)


def load_geonames_gazetteer():
    """Load GeoNames KE.txt gazetteer (~50K entries) grouped by admin divisions."""
    print(f"Loading GeoNames gazetteer from {GEONAMES_FILE}...")
    by_admin = defaultdict(list)
    total = 0

    geonames_cols = [
        "geonameid", "name", "asciiname", "alternatenames",
        "latitude", "longitude", "feature_class", "feature_code",
        "country_code", "cc2", "admin1", "admin2", "admin3", "admin4",
        "population", "elevation", "dem", "timezone", "modification_date"
    ]

    with open(GEONAMES_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 19:
                continue
            try:
                lat = float(row[4])
                lon = float(row[5])
            except (ValueError, IndexError):
                continue

            if not (-5.0 <= lat <= 5.5 and 33.0 <= lon <= 42.5):
                continue

            name = row[1]
            asciiname = row[2]
            alternatenames = row[3]
            feature_class = row[6]
            feature_code = row[7]
            admin1 = row[10]
            admin2 = row[11]

            entry = {
                "name": name,
                "asciiname": asciiname,
                "lat": lat,
                "lon": lon,
                "feature_class": feature_class,
                "feature_code": feature_code,
                "admin1": admin1,
                "admin2": admin2,
                "normalized_name": normalize_name(name),
                "alt_names": [normalize_name(a) for a in alternatenames.split(",")[:5]] if alternatenames else [],
            }

            admin_key = f"{admin1}_{admin2}" if admin2 else admin1
            by_admin[admin_key].append(entry)
            total += 1

    print(f"  Loaded {total} GeoNames entries across {len(by_admin)} admin divisions.")
    return dict(by_admin)


def load_hospital_csv(filepath, label):
    """Load a hospital/pharmacy/community health CSV if columns are suitable."""
    results = []
    if not filepath.exists():
        print(f"  Skipping {label}: file not found.")
        return results

    print(f"  Loading {label} from {filepath}...")
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("Name") or row.get("Officialname") or row.get("name") or ""
                lat = row.get("Latitude") or row.get("latitude") or row.get("lat")
                lon = row.get("Longitude") or row.get("longitude") or row.get("lon") or row.get("lng")
                county = row.get("County") or row.get("county") or ""
                sub_county = row.get("Sub_county") or row.get("Sub county") or row.get("sub_county") or ""

                if lat and lon and name:
                    try:
                        entry = {
                            "name": name.strip(),
                            "lat": float(lat),
                            "lon": float(lon),
                            "county": county.strip(),
                            "sub_county": sub_county.strip(),
                            "normalized_name": normalize_name(name),
                        }
                        results.append(entry)
                    except (ValueError, TypeError):
                        continue
    except Exception as e:
        print(f"  Error loading {label}: {e}")

    print(f"    Got {len(results)} entries from {label}.")
    return results


def build_proximity_index(centroids, healthcare, geonames):
    """Build a constituency-level proximity index mapping each constituency to nearby GeoNames entries."""
    print("Building constituency proximity index...")
    proximity = {}

    for norm_name, centroid in centroids.items():
        clat, clon = centroid["lat"], centroid["lon"]
        nearby = []

        for admin_key, entries in geonames.items():
            for entry in entries:
                dlat = abs(entry["lat"] - clat)
                dlon = abs(entry["lon"] - clon)
                if dlat < 0.5 and dlon < 0.5:
                    nearby.append({
                        "name": entry["name"],
                        "lat": entry["lat"],
                        "lon": entry["lon"],
                        "feature_class": entry["feature_class"],
                        "feature_code": entry["feature_code"],
                        "normalized_name": entry["normalized_name"],
                    })

        proximity[norm_name] = nearby[:200]

    print(f"  Built proximity index for {len(proximity)} constituencies.")
    return proximity


def main():
    print("=" * 60)
    print("ENRICHMENT INDEX BUILDER — GOHAM EDITION")
    print("=" * 60)

    centroids, name_variants = load_constituency_centroids()
    healthcare = load_healthcare_facilities()
    geonames = load_geonames_gazetteer()

    extra_facilities = []
    for csv_file, label in [
        (HOSPITALS_CSV, "Kenya Hospitals"),
        (PHARMACIES_CSV, "Kenya Pharmacies"),
        (COMMUNITY_HEALTH_CSV, "Kenya Community Health"),
    ]:
        extra_facilities.extend(load_hospital_csv(csv_file, label))

    proximity = build_proximity_index(centroids, healthcare, geonames)

    index = {
        "centroids": centroids,
        "name_variants": name_variants,
        "healthcare_by_constituency": healthcare,
        "geonames_by_admin": geonames,
        "extra_facilities": extra_facilities,
        "constituency_proximity": proximity,
        "metadata": {
            "total_centroids": len(centroids),
            "total_healthcare": sum(len(v) for v in healthcare.values()),
            "total_geonames": sum(len(v) for v in geonames.values()),
            "total_extra_facilities": len(extra_facilities),
            "total_proximity_entries": sum(len(v) for v in proximity.values()),
        },
    }

    print(f"\nWriting enrichment index to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False)

    size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"  Written {size_mb:.1f} MB enrichment index.")
    print(f"\nMetadata: {json.dumps(index['metadata'], indent=2)}")
    print("ENRICHMENT INDEX BUILD COMPLETE. GOHAM.")


if __name__ == "__main__":
    main()
