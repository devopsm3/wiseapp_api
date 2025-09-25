import fs from "fs"

// remove file
export const removeFile = async (filePath: string) => {
    try {
        fs.unlinkSync(filePath)
    } catch (error) {
        console.error(error)
    }
}
