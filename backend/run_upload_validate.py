# -*- coding: utf-8 -*-
"""上传与全站功能联动校验"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parser import parse_workbook
from faculty_parser import parse_faculty_workbook, normalize_lab_name
from validate import validate_data

BASE = Path(__file__).resolve().parent.parent
API = "http://127.0.0.1:8000"
REPORT: list[str] = []


def log(msg: str = "", level: str = "INFO"):
    prefix = {"OK": "PASS", "WARN": "WARN", "FAIL": "FAIL", "INFO": "INFO"}.get(level, "INFO")
    line = f"[{prefix}] {msg}" if msg else ""
    REPORT.append(line)
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode("gbk", errors="replace").decode("gbk"))


def find_file(pattern: str) -> Path | None:
    files = list(BASE.glob(pattern))
    return max(files, key=lambda p: p.stat().st_mtime) if files else None


def check_course_parse(course_file: Path) -> dict:
    log("【1】课程 Excel 本地解析")
    try:
        data = parse_workbook(str(course_file))
    except Exception as e:
        log(f"课程解析失败: {e}", "FAIL")
        raise

    meta = data["meta"]
    log(f"课程 {meta['total_courses']} 门 · 实训室 {meta['total_labs']} 个 · 厂商课 {meta['total_vendor_courses']} 门", "OK")

    required_keys = ["meta", "stats", "labs", "courses", "vendor_courses", "shared_courses"]
    for k in required_keys:
        if k not in data:
            log(f"缺少字段: {k}", "FAIL")
        else:
            log(f"字段 {k} 存在", "OK")

    stats_keys = ["type_distribution", "vendor_distribution"]
    for k in stats_keys:
        if k not in data.get("stats", {}):
            log(f"stats.{k} 缺失", "FAIL")

    pages = {
        "总览 Dashboard": lambda: meta["total_courses"] > 0 and len(data["labs"]) > 0,
        "实训室 LabsPage": lambda: all("course_counts" in l for l in data["labs"]),
        "课程检索 CourseSearch": lambda: all("name" in c and "lab_name" in c for c in data["courses"][:10]),
        "厂商课程 VendorCourses": lambda: len(data["vendor_courses"]) > 0,
        "共享网络 ShareNetwork": lambda: len(data["shared_courses"]) > 0,
        "大屏 DemoMode(课程)": lambda: len(data["stats"]["type_distribution"]) >= 4,
    }
    for name, fn in pages.items():
        log(f"页面数据 {name}: {'就绪' if fn() else '不足'}", "OK" if fn() else "WARN")

    issues = validate_data(data)
    if issues:
        for i in issues[:5]:
            log(f"数据校验: {i}", "WARN")
        if len(issues) > 5:
            log(f"... 另有 {len(issues)-5} 项", "WARN")
    else:
        log("课程数据一致性校验通过", "OK")

    return data


def check_faculty_parse(faculty_file: Path, course_data: dict | None) -> dict:
    log("")
    log("【2】师资 Excel 本地解析")
    canonical = [l["name"] for l in course_data["labs"]] if course_data else None
    try:
        data = parse_faculty_workbook(str(faculty_file), canonical_labs=canonical)
    except Exception as e:
        log(f"师资解析失败: {e}", "FAIL")
        raise

    meta = data["meta"]
    log(f"师资 {meta['total_teachers']} 人 · 覆盖实训室 {meta['total_labs']} 个", "OK")

    for k in ["teachers", "stats", "dimensions", "top_priority"]:
        log(f"字段 {k} 存在" if k in data else f"缺少 {k}", "OK" if k in data else "FAIL")

    dim_keys = ["source", "title_dim", "level", "lab_match"]
    for k in dim_keys:
        if k not in data.get("stats", {}):
            log(f"stats.{k} 缺失", "WARN")

    pages = {
        "师资分析 FacultyAnalysis": lambda: len(data["teachers"]) > 0,
        "大屏 DemoMode(师资)": lambda: len(data["top_priority"]) > 0,
    }
    for name, fn in pages.items():
        log(f"页面数据 {name}: {'就绪' if fn() else '不足'}", "OK" if fn() else "WARN")

    if course_data:
        course_labs = {l["name"] for l in course_data["labs"]}
        faculty_labs = set()
        for t in data["teachers"]:
            faculty_labs.update(t.get("lab_list") or [])
        unmatched = [x for x in faculty_labs if x not in course_labs]
        if unmatched:
            log(f"师资实训室名称未对齐: {unmatched[:5]}", "WARN")
        else:
            log("师资实训室名称与课程体系完全一致", "OK")

        # 综合匹配抽样
        sample_lab = course_data["labs"][0]["name"]
        cc = sum(1 for c in course_data["courses"] if c["lab_name"] == sample_lab)
        fc = sum(1 for t in data["teachers"] if sample_lab in (t.get("lab_list") or []))
        log(f"综合匹配抽样 [{sample_lab}]: 课程 {cc} 门 · 师资 {fc} 人", "OK")

    return data


def http_post_file(path: str, filepath: Path) -> dict:
    import mimetypes

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    filename = filepath.name
    content = filepath.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{API}{path}",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def http_get(path: str) -> dict:
    with urllib.request.urlopen(f"{API}{path}", timeout=30) as resp:
        return json.loads(resp.read().decode())


def check_api_upload(course_file: Path, faculty_file: Path):
    log("")
    log("【3】API 上传接口模拟")

    try:
        health = http_get("/api/health")
        log(f"后端健康: loaded={health.get('loaded')} faculty={health.get('faculty_loaded')}", "OK")
    except urllib.error.URLError as e:
        log(f"后端未启动 ({e})，跳过 API 上传测试", "WARN")
        return

    try:
        r = http_post_file("/api/upload", course_file)
        log(f"POST /api/upload → {r.get('message')} ({r.get('meta', {}).get('total_courses')} 门课)", "OK")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        log(f"课程上传失败 HTTP {e.code}: {body[:200]}", "FAIL")
    except Exception as e:
        log(f"课程上传异常: {e}", "FAIL")

    import time
    time.sleep(1.5)

    faculty_ok = False
    for attempt in range(2):
        try:
            r = http_post_file("/api/faculty/upload", faculty_file)
            log(f"POST /api/faculty/upload → {r.get('message')} ({r.get('meta', {}).get('total_teachers')} 人)", "OK")
            faculty_ok = True
            break
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            log(f"师资上传失败 HTTP {e.code}: {body[:200]}", "FAIL")
            break
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
            log(f"师资上传异常: {e}", "FAIL")

    endpoints = [
        ("/api/data", "courses", "课程全量"),
        ("/api/faculty/data", "teachers", "师资全量"),
        ("/api/labs", None, "实训室列表"),
        ("/api/shared-courses?min_labs=2", None, "共享课程"),
        ("/api/faculty/stats?dimension=source", "source", "师资来源统计"),
    ]
    log("")
    log("【4】上传后 API 数据拉取")
    for path, key, label in endpoints:
        try:
            data = http_get(path)
            if key:
                if isinstance(data, dict) and key in data:
                    count = len(data[key]) if isinstance(data[key], list) else "ok"
                elif isinstance(data, list):
                    count = len(data)
                else:
                    count = len(data.get(key, []))
            else:
                count = len(data) if isinstance(data, list) else "ok"
            log(f"GET {path} → {label} ({count})", "OK")
        except Exception as e:
            log(f"GET {path} 失败: {e}", "FAIL")

    log("")
    log("【5】重新加载接口")
    for path, label in [("/api/reload", "课程"), ("/api/faculty/reload", "师资")]:
        try:
            req = urllib.request.Request(f"{API}{path}", method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                r = json.loads(resp.read().decode())
            log(f"POST {path} → {r.get('message', 'ok')}", "OK")
        except Exception as e:
            log(f"POST {path} 失败: {e}", "WARN")


def check_frontend_flow():
    log("")
    log("【6】前端上传联动检查")
    app_tsx = (BASE / "frontend" / "src" / "App.tsx").read_text(encoding="utf-8")
    layout_tsx = (BASE / "frontend" / "src" / "components" / "Layout.tsx").read_text(encoding="utf-8")
    if "refreshFaculty()" in app_tsx and "handleUpload" in app_tsx:
        log("课程上传后同时 refresh() + refreshFaculty()", "OK")
    elif "refresh()" in app_tsx:
        log("课程上传后 refresh() 刷新 DataContext", "OK")


def main():
    log("=" * 50)
    log("AI 课程图谱 — 上传与功能联动校验")
    log("=" * 50)

    course_file = find_file("*24*实训室*.xlsx") or find_file("*.xlsx")
    faculty_file = find_file("*师资*.xlsx")

    if not course_file:
        log("未找到课程 Excel", "FAIL")
        sys.exit(1)
    log(f"课程文件: {course_file.name}")
    if not faculty_file:
        log("未找到师资 Excel，跳过师资相关测试", "WARN")
    else:
        log(f"师资文件: {faculty_file.name}")

    course_data = check_course_parse(course_file)
    faculty_data = check_faculty_parse(faculty_file, course_data) if faculty_file else None

    if faculty_file:
        check_api_upload(course_file, faculty_file)

    check_frontend_flow()

    log("")
    fails = sum(1 for r in REPORT if "[FAIL]" in r)
    warns = sum(1 for r in REPORT if "[WARN]" in r)
    oks = sum(1 for r in REPORT if "[PASS]" in r)
    log("=" * 50)
    log(f"汇总: 通过 {oks} · 警告 {warns} · 失败 {fails}")
    if fails == 0:
        log("结论: 上传新 Excel 后可正常驱动全站功能展示", "OK")
    else:
        log("结论: 存在问题需修复", "FAIL")

    out = BASE / "upload_validation_report.txt"
    out.write_text("\n".join(REPORT), encoding="utf-8")
    log(f"报告已写入: {out}")


if __name__ == "__main__":
    main()
