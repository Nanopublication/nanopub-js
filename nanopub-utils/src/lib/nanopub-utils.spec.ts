import {expect, test} from '@jest/globals'
import {getUpdateStatus, getArtifactCode, getShortCode, isTrustyUri} from './nanopub-utils'

const npTestUrl = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'

test('getUpdateStatus', async () => {
  const status = await getUpdateStatus(npTestUrl)
  expect(status.latestUris?.length).toBeGreaterThan(0)
  expect(status.type.length).toBeGreaterThan(0)
  expect(status.html.length).toBeGreaterThan(0)
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
