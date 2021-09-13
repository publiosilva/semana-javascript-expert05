import fs from 'fs'
import prettyBytes from 'pretty-bytes'

export default class FileHelper {
  static async getFilesStatus (downloadsFolder) {
    const currentFiles = await fs.promises.readdir(downloadsFolder)
    const statuses = await Promise.all(
      currentFiles.map(
        file => fs.promises.stat(`${downloadsFolder}/${file}`)
      )
    )

    const filesStatuses = []

    for (const fileIndex in currentFiles) {
      const { birthtime, size } = statuses[fileIndex]
      filesStatuses.push({
        lastModified: birthtime,
        file: currentFiles[fileIndex],
        owner: 'publi',
        size: prettyBytes(size)
      })
    }

    return filesStatuses
  }
}
