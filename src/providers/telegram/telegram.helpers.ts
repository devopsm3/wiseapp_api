export const normalizeSourceId = (sourceId: string): string => {
    if (!sourceId) return ""

    // 1. Extract after last slash if it's a URL
    let id = sourceId.trim()

    // --- 1️⃣ Handle Telegram URLs ---
    if (id.includes("t.me") || id.includes("telegram.org")) {
        id = id.split("#@").pop() || id.split("/").pop() || id
    }

    else if (
        id.includes("twitter.com") ||
        id.includes("x.com")
    ) {
        const parts = id.split("/")
        id = parts.pop() || id
    }

    if (id.startsWith("@")) {
        id = id.slice(1)
    }

    return id.trim()
}