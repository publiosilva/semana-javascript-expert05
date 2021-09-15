import AWS from 'aws-sdk'
import prettyBytes from 'pretty-bytes'

const s3 = new AWS.S3()

export default class S3FileHelper {
  static async getFilesStatus (bucketName) {
    const params = {
      Bucket: bucketName
    }
    const { Contents: files } = await s3.listObjects(params).promise()

    return files.map((file) => ({
      lastModified: file.LastModified,
      file: file.Key,
      owner: file.Owner.DisplayName,
      size: prettyBytes(file.Size)
    }))
  }
}
