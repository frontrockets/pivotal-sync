const Pull = require('../../src/services/Pull')

describe('.get', () => {
  let context

  function mockPullsGet(data) {
    const response = Promise.resolve({ data })
    context.github.pulls.get = jest.fn().mockReturnValue(response)
  }

  function mockPullsListReviews(data) {
    const response = Promise.resolve({ data })
    context.github.pulls.listReviews = jest.fn().mockReturnValue(response)
  }

  beforeEach(() => {
    context = fakeContext()
    mockPullsGet(fakePull())
    mockPullsListReviews([])
  })

  it('is a Function', () => {
    expect(Pull.get).toBeInstanceOf(Function)
  })

  describe('output', () => {
    const expectResultContaining = result =>
      expect(Pull.get(context, fakeParams())).resolves.toEqual(
        expect.objectContaining(result),
      )

    describe('where reviewsByUser', () => {
      it('is empty object by default', async () => {
        await expectResultContaining({ reviewsByUser: {} })
      })

      it('contains all reviews', async () => {
        mockPullsListReviews([
          fakePullReview({ user: { login: 'user4' }, state: 'DISMISSED' }),
          fakePullReview({ user: { login: 'user1' }, state: 'DISMISSED' }),
          fakePullReview({ user: { login: 'user1' }, state: 'COMMENTED' }),
          fakePullReview({ user: { login: 'user2' }, state: 'COMMENTED' }),
          fakePullReview({
            user: { login: 'user2' },
            state: 'CHANGES_REQUESTED',
          }),
          fakePullReview({
            user: { login: 'user3' },
            state: 'CHANGES_REQUESTED',
          }),
          fakePullReview({ user: { login: 'user3' }, state: 'APPROVED' }),
          fakePullReview({ user: { login: 'user3' }, state: 'COMMENTED' }),
        ])
        await expectResultContaining({
          reviewsByUser: {
            user1: 'COMMENTED',
            user2: 'CHANGES_REQUESTED',
            user3: 'APPROVED',
          },
        })
      })

      it('contains reviews that are just requested', async () => {
        mockPullsGet(
          fakePull({
            requested_reviewers: [{ login: 'user1' }, { login: 'user2' }],
          }),
        )
        mockPullsListReviews([
          fakePullReview({ user: { login: 'user3' }, state: 'APPROVED' }),
        ])

        await expectResultContaining({
          reviewsByUser: {
            user1: 'NEW',
            user2: 'NEW',
            user3: 'APPROVED',
          },
        })
      })

      it('does not contain review from the author', async () => {
        mockPullsGet(fakePull({ user: { login: 'hero' } }))
        mockPullsListReviews([
          fakePullReview({ user: { login: 'hero' }, state: 'APPROVED' }),
          fakePullReview({ user: { login: 'basic' }, state: 'APPROVED' }),
        ])
        await expectResultContaining({
          reviewsByUser: {
            basic: 'APPROVED',
          },
        })
      })
    })

    describe('where isMerged', () => {
      it('is true', async () => {
        mockPullsGet(fakePull({ merged: true }))
        await expectResultContaining({ isMerged: true })
      })
    })

    describe('where isWip', () => {
      it('is falsy by default', async () => {
        mockPullsGet(fakePull())
        await expectResultContaining({ isWip: false })
      })

      it('is truthy when pull is Draft', async () => {
        mockPullsGet(fakePull({ draft: true }))
        await expectResultContaining({ isWip: true })
      })

      it('is truthy when contains WIP label', async () => {
        mockPullsGet(fakePull({ labels: [{ name: 'WIP' }] }))
        await expectResultContaining({ isWip: true })
      })
    })
  })
})

// HELPERS

function fakePullReview(changes) {
  return require('lodash').merge(
    {
      id: 981,
      user: {},
      state: null,
    },
    changes,
  )
}

function fakePull(changes) {
  return require('lodash').merge(
    {
      user: {},
      head: { repo: { name: 'name', full_name: 'owner/name' } },
      labels: [],
      merged: false,
    },
    changes,
  )
}

function fakeParams() {
  return {
    owner: 'O',
    repo: 'R',
    pull_number: 963,
  }
}

function fakeContext() {
  const { Context } = require('probot')
  const { GitHubAPI } = require('probot/lib/github')

  const event = {
    id: '123',
    name: 'push',
    payload: {
      issue: { number: 4 },
      repository: { name: 'probot', owner: { login: 'bkeepers' } },
    },
  }
  const github = GitHubAPI()

  return new Context(event, github, {})
}
