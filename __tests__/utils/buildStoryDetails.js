const buildStoryDetails = require('../../src/utils/buildStoryDetails')

it('is a function', () => {
  expect(buildStoryDetails).toBeInstanceOf(Function)
})

describe('output', () => {
  describe('where reviewsPerRepo', () => {
    it('is an empty object by default', () => {
      const result = buildStoryDetails({ pulls: [] })
      expect(result).toMatchObject({ reviewsPerRepo: {} })
    })

    it('returns correct reviews fo unique repositories', () => {
      const result = buildStoryDetails({
        pulls: [
          fakePull({
            repoName: 'one',
            reviewsByUser: { u1: 'APPROVED', u2: 'COMMENTED' },
          }),
          fakePull({
            isMerged: true,
            repoName: 'two',
            reviewsByUser: {
              u2: 'CHANGES_REQUESTED',
              u3: 'COMMENTED',
              u1: 'NEW',
            },
          }),
        ],
      })
      expect(result).toMatchObject({
        reviewsPerRepo: {
          one: {
            u1: 'pass',
            u2: 'in_review',
          },
          two: {
            u2: 'revise',
            u3: 'in_review',
            u1: 'unstarted',
          },
        },
      })
    })

    it('returns correct reviews when pulls of one repository passed multiple times', () => {
      const result = buildStoryDetails({
        pulls: [
          fakePull({
            repoName: 'one',
            reviewsByUser: { u1: 'APPROVED', u2: 'COMMENTED', u3: 'NEW' },
          }),
          fakePull({
            repoName: 'one',
            reviewsByUser: { u1: 'NEW', u2: 'APPROVED' },
          }),
        ],
      })
      expect(result).toMatchObject({
        reviewsPerRepo: {
          one: { u1: 'unstarted', u2: 'pass', u3: 'unstarted' },
        },
      })
    })

    it('returns correct reviews when merged pull goes after pull of same repository', () => {
      const result = buildStoryDetails({
        pulls: [
          fakePull({
            repoName: 'one',
            reviewsByUser: { u1: 'APPROVED', u2: 'COMMENTED', u3: 'NEW' },
          }),
          fakePull({
            isMerged: true,
            repoName: 'one',
            reviewsByUser: { u1: 'NEW', u2: 'APPROVED' },
          }),
        ],
      })
      expect(result).toMatchObject({
        reviewsPerRepo: {
          one: { u1: 'pass', u2: 'in_review', u3: 'unstarted' },
        },
      })
    })

    it('returns correct reviews when merged pull goes before pull of same repository', () => {
      const result = buildStoryDetails({
        pulls: [
          fakePull({
            isMerged: true,
            repoName: 'one',
            reviewsByUser: { u1: 'APPROVED', u2: 'COMMENTED', u3: 'NEW' },
          }),
          fakePull({
            repoName: 'one',
            reviewsByUser: { u1: 'NEW', u2: 'APPROVED' },
          }),
        ],
      })
      expect(result).toMatchObject({
        reviewsPerRepo: {
          one: { u1: 'unstarted', u2: 'pass', u3: 'unstarted' },
        },
      })
    })

    it('returns correct reviews when all pulls of same repository are merged', () => {
      const result = buildStoryDetails({
        story: {},
        pulls: [
          fakePull({
            isMerged: true,
            repoName: 'one',
            reviewsByUser: { u1: 'APPROVED', u2: 'COMMENTED', u3: 'NEW' },
          }),
          fakePull({
            isMerged: true,
            repoName: 'one',
            reviewsByUser: { u1: 'NEW', u2: 'APPROVED' },
          }),
        ],
      })
      expect(result).toMatchObject({
        reviewsPerRepo: {
          one: { u1: 'unstarted', u2: 'pass', u3: 'unstarted' },
        },
      })
    })

    it('ignores WIP pulls', () => {
      const result = buildStoryDetails({
        pulls: [
          fakePull({
            isWip: false,
            repoName: 'one',
            reviewsByUser: { u: 'NEW' },
          }),
          fakePull({
            isWip: true,
            repoName: 'two',
            reviewsByUser: { u: 'NEW' },
          }),
        ],
      })
      expect(result.reviewsPerRepo).toEqual({
        one: { u: 'unstarted' },
        two: {},
      })
    })
  })

  describe('where state', () => {
    it('is NULL for no related pulls', () => {
      const result = buildStoryDetails({ pulls: [] })
      expect(result).toMatchObject({ state: null })
    })

    it('is NULL when at least one pull is not merged', () => {
      const result = buildStoryDetails({
        pulls: [fakePull(), fakePull({ isMerged: true }), fakePull()],
      })
      expect(result).toMatchObject({ state: null })
    })

    it('is NULL if all pulls are merged and previous state is UNSTARTED', () => {
      const result = buildStoryDetails({
        story: {
          currentState: 'unstarted',
        },
        pulls: [fakePull({ isMerged: true })],
      })
      expect(result).toMatchObject({ state: null })
    })

    it('is DELIVERED if all pulls are merged and previous state s FINISHED', () => {
      const result = buildStoryDetails({
        story: {
          currentState: 'finished',
        },
        pulls: [
          fakePull({ isMerged: true }),
          fakePull({ isMerged: true }),
          fakePull({ isMerged: true }),
        ],
      })
      expect(result).toMatchObject({ state: 'delivered' })
    })
  })
})

// HELPERS

function fakePull(updates) {
  return require('lodash').merge(
    {
      reviewsByUser: {},
    },
    updates,
  )
}
