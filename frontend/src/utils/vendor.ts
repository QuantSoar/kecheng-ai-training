/** 厂商名称规范化（与后端保持一致） */
const VENDOR_ALIASES: Record<string, string> = {
  华清: '华清智言',
}

export function normalizeVendorName(name: string): string {
  const trimmed = name.trim()
  return VENDOR_ALIASES[trimmed] ?? trimmed
}

export function normalizeVendorList<T extends { vendor: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    vendor: normalizeVendorName(item.vendor),
  }))
}
