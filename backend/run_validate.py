# -*- coding: utf-8 -*-
import glob
import sys

sys.path.insert(0, ".")
from parser import parse_workbook
from validate import validate_data, build_vendor_distribution

f = glob.glob(r"d:\Code\Kecheng\*.xlsx")[0]
data = parse_workbook(f)
issues = validate_data(data)

lines = []
lines.append("=" * 60)
lines.append("数据完整性检查报告")
lines.append("=" * 60)
lines.append(f"文件: {f}")
lines.append("")
lines.append("【核心指标】")
m = data["meta"]
lines.append(f"  课程总数: {m['total_courses']}")
lines.append(f"  实训室数: {m['total_labs']}")
lines.append(f"  厂商课程: {m['total_vendor_courses']}")
lines.append(f"  合作厂商: {m['vendor_count']}")
lines.append(f"  共享课程: {m['shared_course_count']}")
lines.append("")
lines.append("【课程类型分布】")
for t in data["stats"]["type_distribution"]:
    lines.append(f"  {t['label']}: {t['count']} ({t['ratio']*100:.1f}%)")
lines.append("")
lines.append("【厂商分布】(来自 vendor_courses 实际统计)")
for v in data["stats"]["vendor_distribution"]:
    lines.append(f"  {v['vendor']}: {v['count']}门, {v['lab_count']}个实训室")
lines.append("")
lines.append("【华清智言课程列表】")
for v in data["vendor_courses"]:
    if v.get("vendor") == "华清智言":
        lines.append(f"  - {v['name']} ({v['lab_name']})")
lines.append("")
if issues:
    lines.append(f"【发现问题】共 {len(issues)} 项:")
    for i, issue in enumerate(issues, 1):
        lines.append(f"  {i}. {issue}")
else:
    lines.append("【检查结果】全部通过，无数据一致性问题")
lines.append("")

out = r"d:\Code\Kecheng\data_check_report.txt"
with open(out, "w", encoding="utf-8") as fp:
    fp.write("\n".join(lines))
print("\n".join(lines))
print(f"\n报告已写入: {out}")
