# -*- coding: utf-8 -*-
from __future__ import annotations

import glob
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from parser import parse_workbook
from faculty_parser import parse_faculty_workbook
from job_map_parser import parse_job_map_workbook

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
FACULTY_UPLOAD_DIR = UPLOAD_DIR / "faculty"
FACULTY_UPLOAD_DIR.mkdir(exist_ok=True)
JOB_UPLOAD_DIR = UPLOAD_DIR / "jobs"
JOB_UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="AI课程图谱 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict | None = None
_cache_file: str | None = None
_faculty_cache: dict | None = None
_faculty_cache_file: str | None = None
_job_cache: dict | None = None
_job_cache_file: str | None = None


def _purge_other_uploads(directory: Path, keep: Path) -> None:
    """上传成功后删除同目录下其他 Excel，不保留历史版本。"""
    try:
        keep_resolved = keep.resolve()
    except OSError:
        return
    for pattern in ("*.xlsx", "*.xls"):
        for f in directory.glob(pattern):
            if not f.is_file():
                continue
            try:
                if f.resolve() != keep_resolved:
                    f.unlink()
            except OSError:
                pass


def _is_job_excel(path: str) -> bool:
    name = os.path.basename(path)
    if "师资" in name:
        return False
    if "岗位" in name or name.lower() == "jobs.xlsx":
        return True
    return False


def _is_course_excel(path: str) -> bool:
    name = os.path.basename(path)
    return "师资" not in name and "岗位" not in name and name.lower() != "jobs.xlsx"


def _find_default_excel() -> str | None:
    """查找课程 Excel：优先根目录 courses.xlsx，再 uploads，避免旧版「24实训室」表被误用。"""
    explicit = BASE_DIR / "courses.xlsx"
    if explicit.is_file() and _is_course_excel(str(explicit)):
        return str(explicit)
    patterns = [
        str(UPLOAD_DIR / "*.xlsx"),
        str(UPLOAD_DIR / "*.xls"),
        str(BASE_DIR / "*.xlsx"),
    ]
    files: list[str] = []
    for pattern in patterns:
        files.extend(f for f in glob.glob(pattern) if _is_course_excel(f))
    if files:
        return max(files, key=os.path.getmtime)
    return None


def _canonical_labs() -> list[str] | None:
    if _cache and _cache.get("labs"):
        return [lab["name"] for lab in _cache["labs"]]
    return None


def _find_default_faculty_excel() -> str | None:
    patterns = [
        str(FACULTY_UPLOAD_DIR / "*.xlsx"),
        str(FACULTY_UPLOAD_DIR / "*.xls"),
        str(BASE_DIR / "*师资*.xlsx"),
        str(BASE_DIR / "*师资*.xls"),
        str(BASE_DIR / "faculty.xlsx"),
    ]
    files: list[str] = []
    for pattern in patterns:
        for f in glob.glob(pattern):
            try:
                if os.path.getsize(f) > 15 * 1024 * 1024:
                    continue
            except OSError:
                continue
            files.append(f)
    if files:
        return max(files, key=os.path.getmtime)
    return None


def _find_default_job_excel() -> str | None:
    patterns = [
        str(JOB_UPLOAD_DIR / "*.xlsx"),
        str(JOB_UPLOAD_DIR / "*.xls"),
        str(BASE_DIR / "*岗位*.xlsx"),
        str(BASE_DIR / "jobs.xlsx"),
    ]
    files: list[str] = []
    for pattern in patterns:
        files.extend(f for f in glob.glob(pattern) if _is_job_excel(f))
    if files:
        return max(files, key=os.path.getmtime)
    return None


def _load_faculty_data(filepath: str) -> dict:
    global _faculty_cache, _faculty_cache_file
    data = parse_faculty_workbook(filepath, canonical_labs=_canonical_labs())
    _faculty_cache = data
    _faculty_cache_file = filepath
    return data


def _get_faculty_cache() -> dict:
    if _faculty_cache is None:
        default = _find_default_faculty_excel()
        if default:
            return _load_faculty_data(default)
        raise HTTPException(
            status_code=404,
            detail="尚未上传师资 Excel，请将「师资多维分析表.xlsx」放到项目根目录，或在「数据管理」页上传",
        )
    return _faculty_cache


def _load_job_data(filepath: str) -> dict:
    global _job_cache, _job_cache_file
    data = parse_job_map_workbook(filepath)
    _job_cache = data
    _job_cache_file = filepath
    return data


def _get_job_cache() -> dict:
    if _job_cache is None:
        default = _find_default_job_excel()
        if default:
            return _load_job_data(default)
        raise HTTPException(
            status_code=404,
            detail="尚未上传岗位映射 Excel，请将文件放到项目根目录，或在「数据管理」页上传",
        )
    return _job_cache


def _load_data(filepath: str) -> dict:
    global _cache, _cache_file
    data = parse_workbook(filepath)
    _cache = data
    _cache_file = filepath
    if _faculty_cache_file:
        try:
            _load_faculty_data(_faculty_cache_file)
        except Exception:
            pass
    return data


def _get_cache() -> dict:
    if _cache is None:
        default = _find_default_excel()
        if default:
            return _load_data(default)
        raise HTTPException(status_code=404, detail="尚未上传 Excel，请将文件放到项目根目录或通过 API 上传")
    return _cache


@app.on_event("startup")
def startup_load():
    default = _find_default_excel()
    if default:
        try:
            _load_data(default)
            print(f"已自动加载课程: {default}")
        except Exception as e:
            print(f"课程自动加载失败: {e}")
    faculty = _find_default_faculty_excel()
    if faculty:
        try:
            _load_faculty_data(faculty)
            print(f"已自动加载师资: {faculty}")
        except Exception as e:
            print(f"师资自动加载失败: {e}")
    job = _find_default_job_excel()
    if job:
        try:
            _load_job_data(job)
            print(f"已自动加载岗位映射: {job}")
        except Exception as e:
            print(f"岗位映射自动加载失败: {e}")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "loaded": _cache is not None,
        "file": _cache_file,
        "faculty_loaded": _faculty_cache is not None,
        "faculty_file": _faculty_cache_file,
        "job_loaded": _job_cache is not None,
        "job_file": _job_cache_file,
    }


@app.get("/api/data")
def get_all_data():
    return _get_cache()


@app.get("/api/meta")
def get_meta():
    data = _get_cache()
    return {"meta": data["meta"], "stats": data["stats"], "source_file": _cache_file}


@app.get("/api/labs")
def get_labs():
    return _get_cache()["labs"]


@app.get("/api/labs/{lab_id}")
def get_lab(lab_id: int):
    data = _get_cache()
    lab = next((l for l in data["labs"] if l["id"] == lab_id), None)
    if not lab:
        lab = next((l for l in data["labs"] if str(l["id"]) == str(lab_id)), None)
    if not lab:
        raise HTTPException(status_code=404, detail="实训室不存在")
    courses = [c for c in data["courses"] if c["lab_name"] == lab["name"]]
    return {**lab, "courses": courses}


@app.get("/api/courses")
def get_courses(
    lab: str | None = None,
    type: str | None = None,
    vendor: str | None = None,
    is_vendor: bool | None = None,
    q: str | None = None,
):
    courses = list(_get_cache()["courses"])
    if lab:
        courses = [c for c in courses if c["lab_name"] == lab]
    if type:
        courses = [c for c in courses if c["type"] == type]
    if is_vendor is not None:
        courses = [c for c in courses if c["is_vendor"] == is_vendor]
    if vendor:
        courses = [c for c in courses if c.get("vendor") == vendor or vendor in c.get("source", "")]
    if q:
        q_lower = q.lower()
        courses = [
            c
            for c in courses
            if q_lower in c["name"].lower()
            or q_lower in c.get("textbook", "").lower()
            or q_lower in c.get("platform", "").lower()
            or q_lower in c.get("source", "").lower()
        ]
    return courses


@app.get("/api/courses/{course_id}")
def get_course(course_id: int):
    data = _get_cache()
    course = next((c for c in data["courses"] if c["id"] == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    shared = next((s for s in data["shared_courses"] if course_id in s["course_ids"]), None)
    return {**course, "shared": shared}


@app.get("/api/vendor-courses")
def get_vendor_courses(vendor: str | None = None, lab: str | None = None):
    items = list(_get_cache()["vendor_courses"])
    if vendor:
        items = [v for v in items if v.get("vendor") == vendor]
    if lab:
        items = [v for v in items if v.get("lab_name") == lab]
    return items


@app.get("/api/vendors")
def get_vendors():
    data = _get_cache()
    return data["stats"].get("vendor_distribution", [])


@app.get("/api/shared-courses")
def get_shared_courses(min_labs: int = 2):
    items = _get_cache()["shared_courses"]
    return [s for s in items if s["lab_count"] >= min_labs]


@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 文件")

    save_path = UPLOAD_DIR / file.filename
    content = await file.read()
    save_path.write_bytes(content)
    _purge_other_uploads(UPLOAD_DIR, save_path)

    try:
        data = _load_data(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel 解析失败: {e}") from e

    return JSONResponse(
        {
            "message": "上传并解析成功",
            "filename": file.filename,
            "meta": data["meta"],
        }
    )


def _resolve_course_excel_path() -> str | None:
    if _cache_file and os.path.isfile(_cache_file):
        return _cache_file
    return _find_default_excel()


def _resolve_faculty_excel_path() -> str | None:
    if _faculty_cache_file and os.path.isfile(_faculty_cache_file):
        return _faculty_cache_file
    return _find_default_faculty_excel()


def _resolve_job_excel_path() -> str | None:
    if _job_cache_file and os.path.isfile(_job_cache_file):
        return _job_cache_file
    return _find_default_job_excel()


@app.post("/api/reload")
def reload_default():
    path = _resolve_course_excel_path()
    if not path:
        raise HTTPException(status_code=404, detail="未找到 Excel 文件")
    data = _load_data(path)
    return {"message": "重新加载成功", "file": path, "meta": data["meta"]}


# ── 师资多维分析 ──


@app.get("/api/faculty/data")
def get_faculty_data():
    return _get_faculty_cache()


@app.get("/api/faculty/meta")
def get_faculty_meta():
    data = _get_faculty_cache()
    return {"meta": data["meta"], "dimensions": data["dimensions"], "source_file": _faculty_cache_file}


@app.get("/api/faculty/teachers")
def get_faculty_teachers(
    source: str | None = None,
    title_dim: str | None = None,
    level: str | None = None,
    field: str | None = None,
    lab: str | None = None,
    q: str | None = None,
):
    items = list(_get_faculty_cache()["teachers"])
    if source:
        items = [t for t in items if t.get("source") == source]
    if title_dim:
        items = [t for t in items if t.get("title_dim") == title_dim]
    if level:
        items = [t for t in items if t.get("level") == level]
    if field:
        items = [t for t in items if field in (t.get("field_tags") or [])]
    if lab:
        items = [t for t in items if lab in (t.get("lab_list") or [])]
    if q:
        ql = q.lower()
        items = [
            t
            for t in items
            if ql in t.get("name", "").lower()
            or ql in t.get("keywords", "").lower()
            or ql in t.get("field", "").lower()
            or ql in t.get("recommender", "").lower()
        ]
    return items


@app.get("/api/faculty/stats")
def get_faculty_stats(dimension: str | None = None):
    data = _get_faculty_cache()
    if dimension:
        stats = data["stats"].get(dimension)
        if stats is None:
            raise HTTPException(status_code=404, detail=f"未知维度: {dimension}")
        return {dimension: stats}
    return data["stats"]


@app.get("/api/faculty/top")
def get_faculty_top(limit: int = 20):
    data = _get_faculty_cache()
    return data["top_priority"][:limit]


@app.post("/api/faculty/upload")
async def upload_faculty_excel(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 文件")

    save_path = FACULTY_UPLOAD_DIR / file.filename
    content = await file.read()
    save_path.write_bytes(content)
    _purge_other_uploads(FACULTY_UPLOAD_DIR, save_path)

    try:
        data = _load_faculty_data(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"师资 Excel 解析失败: {e}") from e

    return JSONResponse(
        {
            "message": "师资数据上传并解析成功",
            "filename": file.filename,
            "meta": data["meta"],
        }
    )


@app.post("/api/faculty/reload")
def reload_faculty_default():
    path = _resolve_faculty_excel_path()
    if not path:
        raise HTTPException(status_code=404, detail="未找到师资 Excel 文件")
    data = _load_faculty_data(path)
    return {"message": "师资数据重新加载成功", "file": path, "meta": data["meta"]}


# ── 岗位映射 ──


@app.get("/api/jobs/data")
def get_job_map_data():
    return _get_job_cache()


@app.get("/api/jobs/meta")
def get_job_map_meta():
    data = _get_job_cache()
    return {"meta": data["meta"], "source_file": _job_cache_file}


@app.post("/api/jobs/upload")
async def upload_job_map_excel(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 文件")

    save_path = JOB_UPLOAD_DIR / file.filename
    content = await file.read()
    save_path.write_bytes(content)
    _purge_other_uploads(JOB_UPLOAD_DIR, save_path)

    try:
        data = _load_job_data(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"岗位映射 Excel 解析失败: {e}") from e

    return JSONResponse(
        {
            "message": "岗位映射上传并解析成功",
            "filename": file.filename,
            "meta": data["meta"],
        }
    )


@app.post("/api/jobs/reload")
def reload_job_default():
    path = _resolve_job_excel_path()
    if not path:
        raise HTTPException(status_code=404, detail="未找到岗位映射 Excel 文件")
    data = _load_job_data(path)
    return {"message": "岗位映射重新加载成功", "file": path, "meta": data["meta"]}
