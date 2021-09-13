
import {
  describe,
  test,
  expect,
  jest
} from '@jest/globals'
import fs from 'fs'
import FileHelper from './../../src/file-helper.js'

describe('FileHelper', () => {
  describe('getFileStatus', () => {
    test('it should return file statuses in correct format', async () => {
      const statMock = {
        dev: 787501337,
        mode: 33206,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 4096,
        ino: 3940649674755419,
        size: 27,
        blocks: 0,
        atimeMs: 1631574517659.5066,
        mtimeMs: 1631379681698.3547,
        ctimeMs: 1631379681698.3547,
        birthtimeMs: 1631379681698.3547,
        atime: '2021-09-13T23:08:37.660Z',
        mtime: '2021-09-11T17:01:21.698Z',
        ctime: '2021-09-11T17:01:21.698Z',
        birthtime: '2021-09-11T17:01:21.698Z'
      }
      const mockUser = 'publi'
      const filename = 'welcome.js'
      jest.spyOn(fs.promises, fs.promises.readdir.name).mockResolvedValue([filename])
      jest.spyOn(fs.promises, fs.promises.stat.name).mockResolvedValue(statMock)

      const result = await FileHelper.getFilesStatus('/tmp')

      expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`)
      expect(result).toMatchObject([{
        size: '27 B',
        lastModified: statMock.birthtime,
        file: filename,
        owner: mockUser
      }])
    })
  })
})
