const _ = require('lodash')
const myProbotApp = require('..')
const { Probot } = require('probot')
const defaultPayload = require('./fixtures/pull_request.merged')
const Pivotal = require('../lib/Pivotal')

jest.mock('../lib/Pivotal')

describe('My Probot app', () => {
  let probot
  let payload

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = { getSignedJsonWebToken: () => 'test' }

    payload = _.cloneDeep(defaultPayload)
  })

  describe('when pull request merged', () => {
    const pullRequestBody = 'https://www.pivotaltracker.com/story/show/1'

    it('sets "delivered" story state', async () => {
      await probot.receive({
        name: 'pull_request',
        payload: _.set(payload, 'pull_request.body', pullRequestBody),
      })

      expect(Pivotal.setStoryState).toHaveBeenLastCalledWith('1', 'delivered')
    })
  })
})
