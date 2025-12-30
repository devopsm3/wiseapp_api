import { prisma } from "../../prisma"

/**
 * Deduplicates existing signals by merging identical predictions (same token, same trend)
 * that occurred within a 72-hour window.
 */
export const deduplicateExistingSignals = async () => {
    console.log("\n 🧹 Starting signals deduplication cleanup...")
    
    // Fetch all signals sorted by entry_timestamp
    const allSignals = await prisma.signal.findMany({
        orderBy: {
            entry_timestamp: "asc"
        },
        include: {
            Source: true
        }
    })

    console.log(`Found ${allSignals.length} total signals.`)
    console.log(" ")
    console.log(" ")
    console.log(" ")
    console.log(" ")
    const timeframeMs = 72 * 60 * 60 * 1000 // 72 hours
    const signalsToDelete: number[] = []
    const mergedCount: { [key: number]: number } = {} // masterId -> count merged into it

    // Group signals by currency and trend
    const groups: { [key: string]: typeof allSignals } = {}
    for (const signal of allSignals) {
        const key = `${signal.currency_label}-${signal.signal_trend}`
        if (!groups[key]) {
            groups[key] = []
        }
        groups[key].push(signal)
    }

    for (const key in groups) {
        const groupSignals = groups[key]
        
        for (let i = 0; i < groupSignals.length; i++) {
            const master = groupSignals[i]
            if (signalsToDelete.includes(master.id)) continue

            const masterSourceIds: number[] = JSON.parse(master.sourceIds || "[]")

            console.log(" 🚀   -->  master.sourceIds:", master.sourceIds)
            console.log(" 🚀   -->  master.id:", master.id)
            console.log(" 🚀   -->  master.source id:", master.sourceId)
            if (masterSourceIds.length === 0) masterSourceIds.push(master.sourceId)

            let masterEntryTime = new Date(master.entry_timestamp).getTime()

            // Look for duplicates in the same group within the timeframe
            for (let j = i + 1; j < groupSignals.length; j++) {
                const duplicate = groupSignals[j]
                if (signalsToDelete.includes(duplicate.id)) continue

                const duplicateEntryTime = new Date(duplicate.entry_timestamp).getTime()
                const diff = Math.abs(duplicateEntryTime - masterEntryTime)

                // If within 72h, merge it
                if (diff <= timeframeMs) {
                    console.log(`Merging signal ${duplicate.id} into ${master.id} (${key})`)
                    
                    const duplicateSourceIds: number[] = JSON.parse(duplicate.sourceIds || "[]")

                    if (duplicateSourceIds.length === 0) duplicateSourceIds.push(duplicate.sourceId)
                        
                    console.log(" 🚀   -->  duplicateSourceIds:", duplicateSourceIds)
                    // Add unique source IDs to master
                    duplicateSourceIds.forEach(id => {
                        console.log(" 🚀   -->  id:", id)
                        if (!masterSourceIds.includes(id)) {
                            console.log(" 🚀   -->  id 2:", id)
                            masterSourceIds.push(id)
                        }
                    })

                    signalsToDelete.push(duplicate.id)
                    mergedCount[master.id] = (mergedCount[master.id] || 0) + 1
                    
                    // Update master in the local array to keep sourceIds current for next potential merge
                    master.sourceIds = JSON.stringify(masterSourceIds)
                    master.sources_nbr = masterSourceIds.length
                } else {
                    // Since it's sorted, any further signal will be outside the window
                    // BUT wait, a group can have a chain of signals. 
                    // However, we only merge into the "master" of that window.
                    break
                }
            }

            // If master was updated, save it to DB
            if (mergedCount[master.id]) {
                console.log(" ")
                console.log(" ")
                console.log(" ")
                console.log(" ")
                console.log(" 🚀   -->  master.id:", master.id)
                console.log(" 🚀   -->  master.sourceIds:", master.sourceIds)
                console.log(" 🚀   -->  master.sources_nbr:", master.sources_nbr)
                await prisma.signal.update({
                    where: { id: master.id },

                    data: {
                        sourceIds: master.sourceIds,
                        sources_nbr: master.sources_nbr,
                        updated_at: new Date()
                    }
                })
            }
        }
    }

    // Delete duplicates

    if (signalsToDelete.length > 0) {
        console.log(" 🚀   -->  signalsToDelete:", signalsToDelete)
        console.log(`Deleting ${signalsToDelete.length} duplicate signals...`)
        // await prisma.signal.deleteMany({
        //     where: {
        //         id: {
        //             in: signalsToDelete
        //         }
        //     }
        // })
    }

    console.log(`✅ Cleanup finished. Merged/Deleted ${signalsToDelete.length} signals.`)
    return {
        processed: allSignals.length,
        deleted: signalsToDelete.length,
        merged: Object.keys(mergedCount).length
    }
}
