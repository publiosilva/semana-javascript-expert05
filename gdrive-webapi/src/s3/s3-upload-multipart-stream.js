import AWS from 'aws-sdk'
import { Writable } from 'stream'

const s3 = new AWS.S3()

export default class S3UploadMultipartStream extends Writable {
  constructor (options, bucket, filename, uploadId) {
    super(options)
    this.bucket = bucket
    this.filename = filename
    this.uploadId = uploadId
    this.partNumber = 0
    this.multipartUpload = {
      Parts: []
    }
    this.buffer = Buffer.alloc(0)
    this.threshold = 1024 * 1024 * 5
  }

  static async init (bucket, filename, options = {}) {
    const params = {
      Bucket: bucket,
      Key: filename
    }
    const { UploadId } = await s3.createMultipartUpload(params).promise()

    return new S3UploadMultipartStream(options, bucket, filename, UploadId)
  }

  async finish () {
    await this._uploadBuffer()

    const params = {
      Bucket: this.bucket,
      Key: this.filename,
      MultipartUpload: this.multipartUpload,
      UploadId: this.uploadId
    }

    await s3.completeMultipartUpload(params).promise()
  }

  async _write (chunk, encoding, callback) {
    this.partNumber++

    await this._uploadPart(chunk)

    callback(null, chunk)
  }

  async _uploadPart (chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])

    if (Buffer.byteLength(this.buffer) >= this.threshold) {
      await this._uploadBuffer()
    }
  }

  async _uploadBuffer () {
    const params = {
      Body: this.buffer,
      Bucket: this.bucket,
      Key: this.filename,
      PartNumber: String(this.partNumber),
      UploadId: this.uploadId
    }

    const partData = await s3.uploadPart(params).promise()

    this.multipartUpload.Parts[this.partNumber - 1] = {
      ETag: partData.ETag,
      PartNumber: Number(this.partNumber)
    }
    this.buffer = Buffer.alloc(0)
  }
}
