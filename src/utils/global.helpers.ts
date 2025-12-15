import fs from "fs"

// remove file
export const removeFile = async (filePath: string) => {
    try {
        fs.unlinkSync(filePath)
    } catch (error) {
        console.error(error)
    }
}

export const toNumberSafe = (v: any): number | null => {
    if (v === null || v === undefined) return null
    if (typeof v === "number") return v
    if (typeof v === "string") {
        const n = Number(v)
        return isNaN(n) ? null : n
    }
    // Prisma Decimal has toNumber()
    if (typeof v === "object" && typeof v.toNumber === "function") {
        try {
            return v.toNumber()
        } catch {
            return null
        }
    }
    // fallback
    const n = Number(v)
    return isNaN(n) ? null : n
}

export const formatTimeFromNow = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
  
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
  
    if (minutes < 60) {
        // Less than 1 hour -> show minutes only
        return `${minutes}min`
    }
  
    if (hours < 24) {
        // Less than 24 hours -> show hours + minutes
        const mins = minutes % 60
        return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`
    }
  
    // More than 1 day -> show days + hours
    const hrs = hours % 24
    return `${days}d${hrs > 0 ? ` ${hrs}h` : ""}`
}
  
export const formatDateTime = (date: Date): string => {
    const pad = (num: number): string => String(num).padStart(2, "0")
  
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1) // Months are 0-based
    const year = date.getFullYear()
  
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
  
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

export const getDaysAgoTimestamp = (days = 21): number => {
    const d = new Date()           
    d.setHours(0, 0, 0, 0)        
    d.setDate(d.getDate() - days) 
    return Math.floor(d.getTime() / 1000) 
}

export const normalizeSourceId = (sourceId: string): string => {
    if (!sourceId) return ""

    let id = sourceId.trim()

    // --- 1️⃣ Handle Telegram URLs ---
    if (id.includes("t.me")) {
        // e.g. t.me/guebli_me
        id = id.split("/").pop() || id
    } 
    else if (id.includes("telegram.org")) {
        // e.g. web.telegram.org/k/#@guebli_me
        const match = id.match(/#@([a-zA-Z0-9_]+)/)
        if (match) id = match[1]
        else id = id.split("/").pop() || id // fallback
    } 
    // --- 2️⃣ Handle Twitter/X URLs ---
    else if (id.includes("twitter.com") || id.includes("x.com")) {
        id = id.split("/").pop() || id
    }

    // Remove @ at start if present
    if (id.startsWith("@")) {
        id = id.slice(1)
    }

    return id.trim()
}
