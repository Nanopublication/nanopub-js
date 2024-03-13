// import {test, expect} from 'vitest'
import {test, expect} from '@playwright/test'
// import {chromium, ChromiumBrowser} from 'playwright'

test.describe('custom element adds "NEWLYADDED" when clicked', async () => {
  test('Input a text in the input box and after search validate one of the book title', async ({page}) => {
    // await page.goto('https://books-pwakit.appspot.com/')
    // await page.locator('#input').fill('Science')
    // await page.keyboard.press('Enter')
    // await expect(page.locator('text=What is Science?')).toBeVisible()

    // Define the custom element tag name
    const CUSTOM_ELEMENT_TAG = 'nanopub-display'
    // Define the content of the page
    const pageContent = `
      <html>
        <head>
          <script src="/dist/nanopub-display.js"></script>
        </head>
        <body>
          <${CUSTOM_ELEMENT_TAG} url="https://w3id.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" id="display" />
        </body>
        <script>
        </script>
      </html>
    `

    // Launch a new Chromium browser instance
    // const browser: ChromiumBrowser = await chromium.launch()

    // expect(document.body.querySelector('my-button')?.shadowRoot?.innerHTML).toContain('World')

    // Create a new page and set its content
    // const page = await browser.newPage()
    await page.setContent(pageContent)

    // Click the custom button element
    // await page.click(CUSTOM_ELEMENT_TAG)

    // Check if the text "NEWLYADDED" is added to the page
    // const elementText = await page.$eval('#output', el => el.textContent)
    // const textMatches = elementText === 'NEWLYADDED'
    // const elementText = await page.$eval('#display', el => el.shadowRoot)

    // console.log(elementText)
    // console.log(document.body.querySelector('nanopub-display')?.shadowRoot?.innerHTML)

    await expect(page.locator('text=Loading')).toBeVisible()

    // Close the browser
    // await browser.close()

    // Assert that the text "NEWLYADDED" is added to the page when the button is clicked
    // expect(textMatches).toBe(true)
  })
})

// TEST WITH PLAYWRIGHT FROM EXAMPLE REPO

// import {afterAll, beforeAll, describe, test} from 'vitest'
// import {preview} from 'vite'
// import type {PreviewServer} from 'vite'
// import {chromium} from 'playwright'
// import type {Browser, Page} from 'playwright'
// import {expect} from '@playwright/test'

// // unstable in Windows, TODO: investigate
// describe.runIf(process.platform !== 'win32')('basic', async () => {
//   let server: PreviewServer
//   let browser: Browser
//   let page: Page

//   beforeAll(async () => {
//     server = await preview({preview: {port: 3000}})
//     browser = await chromium.launch()
//     page = await browser.newPage()
//   })

//   afterAll(async () => {
//     await browser.close()
//     await new Promise<void>((resolve, reject) => {
//       server.httpServer.close(error => (error ? reject(error) : resolve()))
//     })
//   })

//   // https://stackoverflow.com/questions/64784781/how-to-check-if-an-element-exists-on-the-page-in-playwright-js
//   test('should change count when button clicked', async () => {
//     // await page.goto('http://localhost:3000')
//     // const display = page.locator('#display').allTextContents()
//     console.log(await page.content())
//     // await expect(page.locator('#display')).toHaveCount(0)
//     // const button = page.getAttribute('nanopub-display', 'Clicked')
//     // await expect(button).toBeVisible()

//     // await expect(button).toHaveText('Clicked 0 time(s)')

//     // await button.click()
//     // await expect(button).toHaveText('Clicked 1 time(s)')
//   }, 60_000)
// })

// OLDER TEST

// import {beforeEach, describe, expect, it, vi} from 'vitest'
// // import {html} from 'lit/static-html.js'
// // import {NanopubDisplay} from '../nanopub-display'
// // import '../src/my-button'
// import '../nanopub-display'

// describe('nanopub-display', async () => {
//   function getDisplay(): HTMLElement | null | undefined {
//     return document.body.querySelector('nanopub-display')
//   }

//   beforeEach(async () => {
//     document.body.innerHTML =
//       '<nanopub-display url="https://w3id.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />'
//     await new Promise<void>(resolve => {
//       const interval = setInterval(() => {
//         if (getDisplay()) {
//           clearInterval(interval)
//           resolve()
//         }
//       })
//     })
//   })

//   it('Get the loading display', () => {
//     // getDisplay()?.click()
//     console.log('GET DISPLAY', getDisplay())
//     expect(getDisplay()?.textContent).toContain('Loading')
//   })

//   // it('should show name props', () => {
//   //   getDisplay()
//   //   expect(document.body.querySelector('my-button')?.shadowRoot?.innerHTML).toContain('World')
//   // })

//   // it('should dispatch count event on button click', () => {
//   //   const spyClick = vi.fn()

//   //   document.querySelector('my-button')!.addEventListener('count', spyClick)

//   //   getDisplay()?.click()

//   //   expect(spyClick).toHaveBeenCalled()
//   // })
// })
