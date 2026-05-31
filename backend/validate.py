# -*- coding: utf-8 -*-
"""数据完整性校验"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


def build_vendor_distribution(vendor_courses: list[dict]) -> list[dict]:
    counts: Counter[str] = Counter()
    labs_by_vendor: dict[str, set[str]] = defaultdict(set)
    for v in vendor_courses:
        name = (v.get("vendor") or "").strip()
        if not name:
            continue
        counts[name] += 1
        if v.get("lab_name"):
            labs_by_vendor[name].add(v["lab_name"])
    total = sum(counts.values()) or 1
    result = [
        {
            "vendor": name,
            "count": cnt,
            "ratio": cnt / total,
            "lab_count": len(labs_by_vendor.get(name, set())),
        }
        for name, cnt in counts.items()
    ]
    result.sort(key=lambda x: -x["count"])
    return result


def build_type_distribution(courses: list[dict]) -> list[dict]:
    type_map = {
        "general": "通识课程",
        "foundation": "专业基础课",
        "core": "专业核心课",
        "practice": "专业实践课",
        "other": "其他",
    }
    counts: Counter[str] = Counter(c["type"] for c in courses)
    total = sum(counts.values()) or 1
    order = ["general", "foundation", "core", "practice", "other"]
    result = []
    for t in order:
        if counts[t]:
            result.append(
                {
                    "label": type_map.get(t, t),
                    "type": t,
                    "count": counts[t],
                    "ratio": counts[t] / total,
                }
            )
    return result


def validate_data(data: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    courses = data["courses"]
    vendor_courses = data["vendor_courses"]
    labs = data["labs"]
    meta = data["meta"]

    # 1. 华清 不应单独出现
    for v in vendor_courses:
        if v.get("vendor") == "华清":
            issues.append(f"厂商课仍含「华清」: {v['name']}")
    for c in courses:
        src = c.get("source", "")
        if "厂商课程/华清" in src and "华清智言" not in src:
            issues.append(f"课程来源仍含「厂商课程/华清」: {c['name']}")
        if c.get("vendor") == "华清":
            issues.append(f"课程 vendor 仍为华清: {c['name']}")

    for v in data["stats"]["vendor_distribution"]:
        if v["vendor"] == "华清":
            issues.append("vendor_distribution 仍含独立「华清」")

    # 2. 数量一致性
    if len(courses) != meta["total_courses"]:
        issues.append(f"meta.total_courses {meta['total_courses']} != 实际 {len(courses)}")

    if len(labs) != meta["total_labs"]:
        issues.append(f"meta.total_labs {meta['total_labs']} != 实际 {len(labs)}")

    if len(vendor_courses) != meta["total_vendor_courses"]:
        issues.append(
            f"meta.total_vendor_courses {meta['total_vendor_courses']} != 实际 {len(vendor_courses)}"
        )

    vendor_set = {v["vendor"] for v in vendor_courses if v.get("vendor")}
    if len(vendor_set) != meta["vendor_count"]:
        issues.append(f"meta.vendor_count {meta['vendor_count']} != 实际 {len(vendor_set)}")

    # 3. 各实训室课程数
    for lab in labs:
        actual = sum(1 for c in courses if c["lab_name"] == lab["name"])
        if actual != lab["course_counts"]["total"]:
            issues.append(
                f"实训室「{lab['name']}」统计 {lab['course_counts']['total']} != 实际 {actual}"
            )

    # 4. 类型分布
    type_dist = build_type_distribution(courses)
    expected_total = sum(t["count"] for t in type_dist)
    if expected_total != len(courses):
        issues.append(f"类型统计合计 {expected_total} != 课程总数 {len(courses)}")

    # 5. 厂商分布与 vendor_courses 一致
    computed_vendors = build_vendor_distribution(vendor_courses)
    stats_vendors = {v["vendor"]: v["count"] for v in data["stats"]["vendor_distribution"]}
    computed_map = {v["vendor"]: v["count"] for v in computed_vendors}
    for name, cnt in computed_map.items():
        if stats_vendors.get(name) != cnt:
            issues.append(
                f"厂商「{name}」统计 {stats_vendors.get(name)} != vendor_courses 实际 {cnt}"
            )
    for name in stats_vendors:
        if name not in computed_map:
            issues.append(f"vendor_distribution 含 vendor_courses 中不存在的厂商: {name}")

    # 6. OPC 课程应归属华清智言
    opc = [c for c in courses if "OPC" in c.get("name", "")]
    for c in opc:
        if "华清智言" not in c.get("source", "") and c.get("vendor") != "华清智言":
            issues.append(f"OPC 课程未归到华清智言: source={c.get('source')}")

    return issues
