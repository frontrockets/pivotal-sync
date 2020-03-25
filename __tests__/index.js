const bot = require('../src/index')
const refreshStoryDetails = require('../src/refreshStoryDetails')

jest.mock('../src/refreshStoryDetails')

it('is a function', () => {
  expect(bot).toBeInstanceOf(Function)
})

const events = [
  'pull_request.labeled',
  'pull_request.unlabeled',
  'pull_request.edited',
  'pull_request.review_requested',
  'pull_request.review_request_removed',
  'pull_request_review.submitted',
  'pull_request_review.dismissed',
]

describe.each(events)('Subscribed to: %s', eventName => {
  const pivotalLink = 'https://www.pivotaltracker.com/story/show/954'
  const app = {}

  beforeEach(() => {
    app.on = jest.fn()
    refreshStoryDetails.mockReset()
  })

  it('it subscribed', () => {
    bot(app)

    expect(app.on).toHaveBeenCalledWith(eventName, expect.anything())
  })

  it('refreshes story', async () => {
    bot(app)
    const handler = app.on.mock.calls.find(call => call[0] === eventName)[1]
    const context = {
      payload: {
        organization: { login: 'Owner' },
        repository: { name: 'Repo' },
        pull_request: { number: 'Number', body: pivotalLink },
      },
    }
    await handler(context)

    expect(refreshStoryDetails).toHaveBeenCalledWith({
      storyId: '954',
      initiator: {
        owner: 'Owner',
        repo: 'Repo',
        pull_number: 'Number',
      },
      context,
    })
  })

  it('does not refreshes story if initiator does not contain pivotal link', async () => {
    bot(app)
    const handler = app.on.mock.calls.find(call => call[0] === eventName)[1]
    const context = {
      payload: {
        pull_request: { body: 'Anything But Not Pivotal Link' },
      },
    }
    await handler(context)

    expect(refreshStoryDetails).not.toBeCalled()
  })
})
