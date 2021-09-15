import {
  beforeEach, describe, expect,
  jest, test
} from '@jest/globals'
import { logger } from '../../../src/common/logger.js'
import Routes from '../../../src/local/routes.js'
import UploadHandler from '../../../src/local/upload-handler.js'
import TestUtil from '../../_util/test-util.js'

describe('Routes', () => {
  const request = TestUtil.generateReadableStream(['some file bytes'])
  const response = TestUtil.generateWritableStream(() => { })
  const defaultParams = {
    request: Object.assign(request, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      method: '',
      body: {}
    }),
    response: Object.assign(response, {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn()
    }),
    values: () => Object.values(defaultParams)
  }

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation()
  })

  describe('setSockerInstance', () => {
    test('should store io instance', () => {
      const routes = new Routes()
      const ioObj = {
        to: (id) => ioObj,
        emit: (event, message) => { }
      }

      routes.setSocketInstance(ioObj)

      expect(routes.io).toStrictEqual(ioObj)
    })
  })

  describe('handler', () => {
    test('given an inexistent route it should choose default route', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      params.request.method = 'inexistent'

      await routes.handler(...params.values())

      expect(params.response.end).toHaveBeenCalledWith('hello world')
    })

    test('it should ser any request with CORS enabled', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      params.request.method = 'inexistent'

      await routes.handler(...params.values())

      expect(params.response.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
    })

    test('given method OPTIONS it should choose options route', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      params.request.method = 'OPTIONS'

      await routes.handler(...params.values())

      expect(params.response.writeHead).toHaveBeenCalledWith(204)
      expect(params.response.end).toHaveBeenCalled()
    })

    test('given method POST it should choose post route', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      params.request.method = 'POST'
      jest.spyOn(routes, routes.post.name).mockResolvedValue()

      await routes.handler(...params.values())

      expect(routes.post).toHaveBeenCalled()
    })

    test('given method GET it should choose get route', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      params.request.method = 'GET'
      jest.spyOn(routes, routes.get.name).mockResolvedValue()

      await routes.handler(...params.values())

      expect(routes.get).toHaveBeenCalled()
    })
  })

  describe('get', () => {
    test('given method get it should list all files downloaded', async () => {
      const routes = new Routes()
      const params = {
        ...defaultParams
      }
      const filesStatusesMock = [{
        size: 'any_size',
        lastModified: 'any_last_modified',
        file: 'any_file.ext',
        owner: 'any_owner'
      }]
      jest.spyOn(routes.fileHelper, routes.fileHelper.getFilesStatus.name).mockResolvedValue(filesStatusesMock)
      params.request.method = 'GET'

      await routes.handler(...params.values())

      expect(params.response.writeHead).toHaveBeenCalledWith(200)
      expect(params.response.end).toHaveBeenCalledWith(JSON.stringify(filesStatusesMock))
    })
  })

  describe('post', () => {
    test('it should validate post route workflow', async () => {
      const routes = new Routes('/tmp')
      const options = {
        ...defaultParams
      }
      options.request.method = 'POST'
      options.request.url = '?socketId=any_socket_id'

      jest.spyOn(UploadHandler.prototype, UploadHandler.prototype.registerEvents.name).mockImplementation((headers, onFinish) => {
        const writable = TestUtil.generateWritableStream(() => { })
        writable.on('finish', onFinish)

        return writable
      })

      await routes.handler(...options.values())

      expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled()
      expect(options.response.writeHead).toHaveBeenCalledWith(200)
      expect(options.response.end).toHaveBeenCalledWith(JSON.stringify({ result: 'Files uploaded with success!' }))
    })
  })
})
