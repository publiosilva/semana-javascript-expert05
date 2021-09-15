import Busboy from 'busboy'
import { pipeline } from 'stream/promises'
import { logger } from '../common/logger.js'
import S3UploadMultipartStream from './s3-upload-multipart-stream.js'

const ON_UPLOAD_EVENT = 'file-upload'

export default class S3UploadHandler {
  constructor ({ io, socketId, downloadsFolder, messageTimeDelay = 200 }) {
    this.io = io
    this.socketId = socketId
    this.downloadsFolder = downloadsFolder
    this.messageTimeDelay = messageTimeDelay
    this.accumulator = Buffer.alloc(0)
  }

  canExecute (lastExecution) {
    return (Date.now() - lastExecution) >= this.messageTimeDelay
  }

  handleFileBytes (filename) {
    this.lastMessageSent = Date.now()

    async function * handleData (source) {
      let processedAlready = 0

      for await (const chuck of source) {
        yield chuck

        processedAlready += chuck.length

        if (!this.canExecute(this.lastMessageSent)) {
          continue
        }

        this.lastMessageSent = Date.now()
        this.io.to(this.socketId).emit(ON_UPLOAD_EVENT, {
          processedAlready, filename
        })

        logger.info(`File [${filename}] got ${processedAlready} bytes to ${this.socketId}`)
      }
    }

    return handleData.bind(this)
  }

  async onFile (fieldname, file, filename) {
    const bucketName = 'semanajsexpert5'
    const s3UploadMultipartStream = await S3UploadMultipartStream.init(bucketName, filename)
    await pipeline(file, this.handleFileBytes(filename), s3UploadMultipartStream)
    await s3UploadMultipartStream.finish()

    logger.info(`File [${filename}] finished`)
  }

  registerEvents (headers, onFinish) {
    const busboy = new Busboy({
      headers
    })
    busboy.on('file', this.onFile.bind(this))
    busboy.on('finish', onFinish)

    return busboy
  }
}
