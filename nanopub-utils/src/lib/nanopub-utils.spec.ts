import {expect, test} from '@jest/globals'
import {getLatestNp, getUpdateStatus, getArtifactCode, getShortCode, isTrustyUri} from './nanopub-utils'

const npTestUrl = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'

test('getUpdateStatus', async () => {
  const statusList = await getUpdateStatus(npTestUrl)
  expect(statusList.latestUris.length).toBeGreaterThan(0)
  expect(statusList.type.length).toBeGreaterThan(0)
  expect(statusList.html.length).toBeGreaterThan(0)
})

test('get latest np', () => {
  getLatestNp((np: string) => expect(np.length).toBeGreaterThan(0))
})

test('is Trusty URI', () => {
  expect(isTrustyUri(npTestUrl)).toBe(true)
})

test('get artifact code', () => {
  expect(getArtifactCode(npTestUrl)).toBe('RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU')
})

test('get short code', () => {
  expect(getShortCode(npTestUrl)).toBe('RAHtkscyyy')
})
