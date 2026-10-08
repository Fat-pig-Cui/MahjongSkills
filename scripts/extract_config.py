#!/usr/bin/env python3
"""Extract selected rule evidence from Mahjong Soul's public ConfigTables."""

import argparse
import hashlib
import json
import re
import struct
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path


BASE = "https://game.maj-soul.com/1/"
PINNED_VERSION = "0.11.252.w"
PINNED_SHA256 = "a5959513fa31d3b5297d2dda400c86c0eacbdb4adad461b583439d7f673c9086"
SELECTED = {
    ("desktop", "matchmode"): {2, 3, 17, 18, 19, 20, 21, 22},
    ("str", "str"): {3, 24, 25, 63},
    ("fan", "fan"): {34},
    ("fandesc", "fandesc"): {116, 501},
}


def varint(data, offset):
    value = 0
    for shift in range(0, 70, 7):
        if offset >= len(data):
            raise ValueError("Truncated protobuf varint")
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if not byte & 128:
            if shift == 63 and byte > 1:
                raise ValueError("Varint exceeds 64 bits")
            return value, offset
    raise ValueError("Varint exceeds 10 bytes")


def wire(data):
    """Parse wire values, preserving fixed-width bytes for schema-aware decoding."""
    fields = defaultdict(list)
    offset = 0
    while offset < len(data):
        tag, offset = varint(data, offset)
        number, kind = tag >> 3, tag & 7
        if number == 0:
            raise ValueError("Protobuf field number zero")
        if kind == 0:
            value, offset = varint(data, offset)
        elif kind in (1, 2, 5):
            if kind == 2:
                size, offset = varint(data, offset)
            else:
                size = 8 if kind == 1 else 4
            if offset + size > len(data):
                raise ValueError("Truncated protobuf field")
            value = data[offset:offset + size]
            offset += size
        else:
            raise ValueError(f"Unsupported wire type {kind}")
        fields[number].append(value)
    return dict(fields)


def first(fields, number, default=None):
    values = fields.get(number, [])
    return values[0] if values else default


def decode_scalar(value, pb_type):
    if pb_type == "string":
        if not isinstance(value, bytes):
            raise ValueError("String field did not use length-delimited encoding")
        return value.decode("utf-8")
    if isinstance(value, bytes):
        formats = {"float": "<f", "double": "<d", "fixed32": "<I", "fixed64": "<Q",
                   "sfixed32": "<i", "sfixed64": "<q"}
        if pb_type in formats:
            return struct.unpack(formats[pb_type], value)[0]
        if pb_type == "bytes":
            return value.hex()
        raise ValueError(f"Unsupported selected field encoding/type: {pb_type}")
    if pb_type == "bool":
        return bool(value)
    if pb_type in {"sint32", "sint64"}:
        return (value >> 1) ^ -(value & 1)
    if pb_type in {"int32", "int64"}:
        bits = 32 if pb_type == "int32" else 64
        value &= (1 << bits) - 1
        return value - (1 << bits) if value & (1 << (bits - 1)) else value
    if pb_type in {"uint32", "uint64"}:
        return value
    raise ValueError(f"Unsupported selected field type: {pb_type}")


def extract(raw, version):
    root = wire(raw)
    if not root.get(3) or not root.get(4):
        raise ValueError("Not a ConfigTables message with schemas and data")
    schemas = {}
    for table_raw in root[3]:
        table = wire(table_raw)
        table_name = first(table, 1, b"").decode()
        for sheet_raw in table.get(2, []):
            sheet = wire(sheet_raw)
            sheet_name = first(sheet, 1, b"").decode()
            key = (table_name, sheet_name)
            if key not in SELECTED:
                continue
            fields = {}
            for field_raw in sheet.get(3, []):
                field = wire(field_raw)
                index = first(field, 4)
                if not index:
                    raise ValueError("Schema field is missing pb_index")
                fields[index] = (first(field, 1).decode(), first(field, 3).decode(), first(field, 2, 0))
            schemas[key] = fields
    output = {"resource_version": version, "source": f"{BASE}v{version}/res/config/lqc.lqbin",
              "sha256": hashlib.sha256(raw).hexdigest(),
              "config_version": first(root, 1, b"").decode(),
              "header_hash": first(root, 2, b"").decode(), "tables": {}}
    for sheet_raw in root[4]:
        sheet = wire(sheet_raw)
        key = (first(sheet, 1, b"").decode(), first(sheet, 2, b"").decode())
        if key not in SELECTED:
            continue
        if key not in schemas:
            raise ValueError(f"No schema for selected sheet {key}")
        fields = schemas[key]
        id_index = next((n for n, field in fields.items() if field[0] == "id"), None)
        rows = []
        for row_raw in sheet.get(3, []):
            encoded = wire(row_raw)
            if first(encoded, id_index) not in SELECTED[key]:
                continue
            row = {}
            for number, (name, typ, array_length) in fields.items():
                wanted = (name in {"id", "init_point", "back_point", "mode", "type", "room_name_chs"}
                          if key[0] == "desktop" else name in {"id", "name_chs", "xuanshang", "fan_menqing", "fan_fulu"}
                          if key[0] == "fan" else name == "id" or name.endswith("chs"))
                if not wanted:
                    continue
                values = [decode_scalar(v, typ) for v in encoded.get(number, [])]
                # proto3 omitted scalar fields use defaults.
                default = "" if typ == "string" else False if typ == "bool" else 0
                row[name] = values if array_length else (values[0] if values else default)
            rows.append(row)
        output["tables"][".".join(key)] = sorted(rows, key=lambda r: r["id"])
    for key, ids in SELECTED.items():
        name = ".".join(key)
        rows = output["tables"].get(name, [])
        if {r["id"] for r in rows} != ids or len(rows) != len(ids):
            raise ValueError(f"Selected rows missing/duplicated: {name}")
    return output


def download(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read()


def resolve_config(version):
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+\.w", version):
        raise ValueError("Invalid resource version")
    manifest_url = f"{BASE}resversion{version}.json"
    manifest = json.loads(download(manifest_url))
    item = manifest.get("res", manifest).get("res/config/lqc.lqbin")
    if not isinstance(item, dict) or not isinstance(item.get("prefix"), str):
        raise ValueError("Manifest does not provide a config prefix")
    prefix = item["prefix"]
    if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+\.w/?", prefix):
        raise ValueError("Unexpected public-resource prefix")
    return f"{BASE}{prefix.rstrip('/')}/res/config/lqc.lqbin", manifest_url


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Decode a local lqc.lqbin without networking")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--version", default=PINNED_VERSION)
    group.add_argument("--latest", action="store_true", help="Resolve current public resource version")
    parser.add_argument("--output", type=Path, help="Write extracted JSON; default stdout")
    parser.add_argument("--compare", type=Path, help="Require semantic equality with a saved excerpt")
    args = parser.parse_args()
    try:
        if args.input and args.latest:
            raise ValueError("--input is offline; do not combine it with --latest")
        version = json.loads(download(BASE + "version.json"))["version"] if args.latest else args.version
        if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+\.w", version):
            raise ValueError("Invalid resource version")
        if args.input:
            raw = args.input.read_bytes()
            source, manifest_url = f"{BASE}v{version}/res/config/lqc.lqbin", f"{BASE}resversion{version}.json"
        else:
            source, manifest_url = resolve_config(version)
            raw = download(source)
        if version == PINNED_VERSION and hashlib.sha256(raw).hexdigest() != PINNED_SHA256:
            raise ValueError("Pinned 2026-10-07 config hash differs; preserve the old evidence and inspect the new resource separately")
        result = extract(raw, version)
        result["source"] = source
        result["manifest"] = manifest_url
        if args.compare and result != json.loads(args.compare.read_text()):
            raise ValueError("Extracted excerpt differs from saved evidence")
        text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(text)
            print(f"Extracted {sum(len(r) for r in result['tables'].values())} rows; SHA256 {result['sha256']}")
        else:
            print(text, end="")
    except (ValueError, KeyError, UnicodeError, OSError, struct.error) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
