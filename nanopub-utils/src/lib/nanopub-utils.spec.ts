import {expect, test} from '@jest/globals'
import {getUpdateStatus} from './nanopub-utils'

test('getUpdateStatus', async () => {
  const statusList = await getUpdateStatus(npTestUrl)
  expect(statusList.latestUris.length).toBeGreaterThan(0)
  expect(statusList.type.length).toBeGreaterThan(0)
  expect(statusList.html.length).toBeGreaterThan(0)
})

const npTestUrl = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'
