const app = require('..')

const syncStoryState = require('../syncStoryState')
const syncCodeReviews = require('../syncCodeReviews')

jest.mock('../syncStoryState')
jest.mock('../syncCodeReviews')

beforeEach(() => {
  syncStoryState.mockClear()
  syncCodeReviews.mockClear()
})

it('initializes syncStoryState', () => {
  const argument = { application: 1 }
  app(argument)

  expect(syncStoryState.mock.calls[0][0]).toBe(argument)
})

it('initializes syncCodeReviews', () => {
  const argument = { application: 2 }
  app(argument)

  expect(syncCodeReviews.mock.calls[0][0]).toBe(argument)
})
