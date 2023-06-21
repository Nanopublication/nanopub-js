import {expect, test} from '@jest/globals'
import {getUpdateStatus} from './nanopub-utils'

test('getUpdateStatus', async () => {
  const statusList = await getUpdateStatus(npTestUrl)
  expect(statusList.length).toBeGreaterThan(0)
})

const npTestUrl = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'
