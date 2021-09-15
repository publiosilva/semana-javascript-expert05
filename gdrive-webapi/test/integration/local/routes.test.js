import {
  afterAll, beforeAll, beforeEach, describe, expect,
  jest, test
} from '@jest/globals'
import FormData from 'form-data'
import fs from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { logger } from '../../../src/common/logger.js'
import Routes from '../../../src/local/routes.js'
import TestUtil from '../../_util/test-util.js'

describe('Routes integration teste', () => {
  let defaultDownloadsFolder = ''

  beforeAll(async () => {
    defaultDownloadsFolder = await fs.promises.mkdtemp(join(tmpdir(), 'downloads-'))
  })

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation()
  })

  afterAll(async () => {
    await fs.promises.rm(defaultDownloadsFolder, { recursive: true })
  })

  describe('getFileStatus', () => {
    const ioObj = {
      to: (id) => ioObj,
      emit: (event, message) => { }
    }

    test('should upload file to the folder', async () => {
      const filename = 'moon-rover.png'
      const fileStream = fs.createReadStream(`./test/integration/mocks/${filename}`)
      const response = TestUtil.generateWritableStream(() => { })
      const form = new FormData()
      form.append('photo', fileStream)
      const defaultParams = {
        request: Object.assign(form, {
          headers: form.getHeaders(),
          method: 'POST',
          url: '?socketId=any_socket_id'
        }),
        response: Object.assign(response, {
          setHeader: jest.fn(),
          writeHead: jest.fn(),
          end: jest.fn()
        }),
        values: () => Object.values(defaultParams)
      }
      const routes = new Routes(defaultDownloadsFolder)
      routes.setSocketInstance(ioObj)
      const dirBeforeRan = await fs.promises.readdir(defaultDownloadsFolder)
      expect(dirBeforeRan).toEqual([])
      await routes.handler(...defaultParams.values())
      const dirAfterRan = await fs.promises.readdir(defaultDownloadsFolder)
      expect(dirAfterRan).toEqual([filename])
      expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200)
      expect(defaultParams.response.end).toHaveBeenCalledWith(JSON.stringify({ result: 'Files uploaded with success!' }))
    })
  })
})
