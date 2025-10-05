export const normalizeSourceId = (sourceId: string): string => {
    if (!sourceId) return ""

    // 1. Extract after last slash if it's a URL
    let id = sourceId.trim()
    if (id.includes("telegram.org") || id.includes("t.me")) {
        id = id.split("#@").pop() || id.split("/").pop() || id
    }
  
    // 2. Remove "@" if exists
    if (id.startsWith("@")) {
        id = id.slice(1)
    }
  
    return id.trim()
}