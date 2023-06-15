import {expect, test} from '@jest/globals'
import {Nanopub} from './nanopub'

test('fetch', async () => {
  const url = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'
  const np = await Nanopub.fetch(url)
  expect(np.url).toBe(url)
  expect(np.rdfString.length).toBeGreaterThan(10)
  expect(Object.keys(np.displayNp).length).toBe(4)
})
