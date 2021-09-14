import {
  describe,
  test,
  expect,
  beforeEach,
  jest
} from '@jest/globals'
import fs from 'fs'
import { resolve } from 'path'
import { pipeline } from 'stream/promises'
import { logger } from '../../src/logger'
import UploadHandler from '../../src/upload-handler'
import TestUtil from '../_util/test-util'

describe('UploadHandler', () => {
  const ioObj = {
    to: (id) => ioObj,
    emit: (event, message) => {}
  }

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation()
  })

  describe('registerEvents', () => {
    test('should call onFile and onFinish functions on Busboy instance', () => {
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: 'any_socket_id'
      })
      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue()
      const headers = {
        'content-type': 'multipart/form-data; boundary='
      }
      const onFinish = jest.fn()
      const busboyInstance = uploadHandler.registerEvents(headers, onFinish)
      const fileStream = TestUtil.generateReadableStream([
        'chunk',
        'of',
        'data'
      ])

      busboyInstance.emit('file', 'fieldname', fileStream, 'filename.txt')
      busboyInstance.listeners('finish')[0].call()

      expect(uploadHandler.onFile).toHaveBeenCalled()
      expect(onFinish).toHaveBeenCalled()
    })
  })

  describe('onFile', () => {
    test('given a stream file it should save it on disk', async () => {
      const chunks = ['key', 'dude']
      const downloadsFolder = '/any_folder'
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: 'any_socket_id',
        downloadsFolder
      })
      const onData = jest.fn()
      jest.spyOn(fs, fs.createWriteStream.name).mockImplementation(() => TestUtil.generateWritableStream(onData))
      const onTransform = jest.fn()
      jest.spyOn(uploadHandler, uploadHandler.handleFileBytes.name).mockImplementation(() => TestUtil.generateTransformStream(onTransform))
      const params = {
        fieldname: 'video',
        file: TestUtil.generateReadableStream(chunks),
        filename: 'mockFile.mov'
      }

      await uploadHandler.onFile(...Object.values(params))

      expect(onData.mock.calls.join()).toEqual(chunks.join())
      expect(onTransform.mock.calls.join()).toEqual(chunks.join())
      const expectedFilename = resolve(uploadHandler.downloadsFolder, params.filename)
      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename)
    })
  })

  describe('handleFileBytes', () => {
    test('should call emit function and it is a transform stream', async () => {
      jest.spyOn(ioObj, ioObj.to.name)
      jest.spyOn(ioObj, ioObj.emit.name)
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: 'any_socket_id'
      })
      jest.spyOn(uploadHandler, uploadHandler.canExecute.name).mockReturnValueOnce(true)
      const messages = ['hello']
      const source = TestUtil.generateReadableStream(messages)
      const onWrite = jest.fn()
      const target = TestUtil.generateWritableStream(onWrite)

      await pipeline(source, uploadHandler.handleFileBytes('filename.txt'), target)

      expect(ioObj.to).toHaveBeenCalledTimes(messages.length)
      expect(ioObj.emit).toHaveBeenCalledTimes(messages.length)
      expect(onWrite).toHaveBeenCalledTimes(messages.length)
      expect(onWrite.mock.calls.join()).toEqual(messages.join())
    })

    test('given message timerDelay as 2 seconds it should emit only one message during 3 seconds period', async () => {
      jest.spyOn(ioObj, ioObj.emit.name)
      const messageTimeDelay = 2000
      const day = '2021-07-01 01:01'
      const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`)
      const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`)
      const onSecondUpdateLastMessageSent = onFirstCanExecute
      const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`)
      const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`)

      TestUtil.mockDateNow([
        onFirstLastMessageSent,
        onFirstCanExecute,
        onSecondUpdateLastMessageSent,
        onSecondCanExecute,
        onThirdCanExecute
      ])
      const messages = ['hello', 'world', '!']
      const filename = 'mockFile.mov'
      const source = TestUtil.generateReadableStream(messages)
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: 'any_socket_id',
        messageTimeDelay
      })

      await pipeline(source, uploadHandler.handleFileBytes(filename))

      expect(ioObj.emit).toHaveBeenCalledTimes(2)

      const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls

      expect(firstCallResult).toEqual([uploadHandler.ON_UPLOAD_EVENT, {
        processedAlready: 'hello'.length, filename
      }])
      expect(secondCallResult).toEqual([uploadHandler.ON_UPLOAD_EVENT, {
        processedAlready: messages.join('').length, filename
      }])
    })
  })

  describe('canExecute', () => {
    test('should return true when time is later than specified delay', () => {
      const timerDelay = 1000
      const uploadHandler = new UploadHandler(
        {
          io: {},
          socketId: '',
          messageTimeDelay: timerDelay
        }
      )
      const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:03')
      TestUtil.mockDateNow([tickNow])
      const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

      const result = uploadHandler.canExecute(lastExecution)

      expect(result).toBeTruthy()
    })

    test('should return false when time is not later than specified delay', () => {
      const timerDelay = 3000
      const uploadHandler = new UploadHandler(
        {
          io: {},
          socketId: '',
          messageTimeDelay: timerDelay
        }
      )
      const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:01')
      TestUtil.mockDateNow([tickNow])
      const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

      const result = uploadHandler.canExecute(lastExecution)

      expect(result).toBeFalsy()
    })
  })
})
