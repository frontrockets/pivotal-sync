const nock = require('nock')

const Story = require('../../src/services/Story')

nock.disableNetConnect()
const reqPivotal = nock('https://www.pivotaltracker.com/services/v5')
const reqPutPivotal = reqPivotal.persist().put('/stories/895')

beforeEach(() => {
  nock.cleanAll()
  reqPivotal
    .get('/projects/17?fields=review_types')
    .reply(200, { review_types: [] })
  reqPivotal.get('/projects/17/memberships').reply(200, [])
})

describe('.update', () => {
  it('is a function', () => {
    expect(Story.update).toBeInstanceOf(Function)
  })

  describe('where reviews', () => {
    let story

    beforeEach(() => {
      nock.cleanAll('/pro')

      reqPivotal.get('/projects/19?fields=review_types').reply(200, {
        review_types: [
          { id: 'tid1', name: 'PR:repo1' },
          { id: 'tid2', name: 'PR:repo2' },
        ],
      })

      reqPivotal
        .get('/projects/19/memberships')
        .reply(200, [
          { person: { id: 'uid1', username: 'user1' } },
          { person: { id: 'uid2', username: 'user2' } },
        ])

      story = fakeStory({
        id: 421,
        projectId: 19,
        reviews: [
          fakeStoryReview({
            id: 1,
            review_type_id: 'tid1',
            reviewer_id: 'uid1',
            status: 'unstarted',
          }),
          fakeStoryReview({
            id: 2,
            review_type_id: 'tid1',
            reviewer_id: 'uid2',
            status: 'unstarted',
          }),
          fakeStoryReview({
            id: 3,
            review_type_id: 'tid2',
            reviewer_id: 'uid2',
            status: 'unstarted',
          }),
        ],
      })
    })

    it('removes all existing and not matching reviews', async () => {
      const deleteReq1 = reqPivotal.delete('/stories/421/reviews/2').reply(200)
      const deleteReq2 = reqPivotal.delete('/stories/421/reviews/3').reply(200)

      await Story.update({
        story,
        updates: {
          reviewsPerRepo: {
            repo1: { user1: 'unstarted' },
          },
        },
      })

      deleteReq1.done()
      deleteReq2.done()
    })

    it('adds all missing reviews', async () => {
      const reqCreate1 = reqPivotal
        .post('/stories/421/reviews', {
          review_type_id: 'tid2',
          reviewer_id: 'uid1',
          status: 'unstarted',
        })
        .reply(200)

      await Story.update({
        story,
        updates: {
          reviewsPerRepo: {
            repo1: { user1: 'unstarted', user2: 'unstarted' },
            repo2: { user1: 'unstarted', user2: 'unstarted' },
          },
        },
      })

      reqCreate1.done()
    })

    it('updates all existing and matching reviews', async () => {
      const reqUpdate1 = reqPivotal
        .put('/stories/421/reviews/1', { status: 'next' })
        .reply(200)
      const reqUpdate2 = reqPivotal
        .put('/stories/421/reviews/2', { status: 'next' })
        .reply(200)

      await Story.update({
        story,
        updates: {
          reviewsPerRepo: {
            repo1: { user1: 'next', user2: 'next' },
            repo2: { user2: 'unstarted' },
          },
        },
      })

      reqUpdate1.done()
      reqUpdate2.done()
    })

    it('removes, adds and updates reviews at the same time', async () => {
      const reqDelete = reqPivotal.delete('/stories/421/reviews/1').reply(200)
      const reqUpdate = reqPivotal
        .put('/stories/421/reviews/2', { status: 'next' })
        .reply(200)
      const reqCreate = reqPivotal
        .post('/stories/421/reviews', {
          status: 'unstarted',
          review_type_id: 'tid2',
          reviewer_id: 'uid1',
        })
        .reply(200)

      await Story.update({
        story,
        updates: {
          reviewsPerRepo: {
            repo1: { user2: 'next' },
            repo2: { user1: 'unstarted', user2: 'unstarted' },
          },
        },
      })

      reqDelete.done()
      reqUpdate.done()
      reqCreate.done()
    })
  })

  describe('where state', () => {
    it('is updated', async () => {
      let body
      reqPutPivotal.reply(200, (url, reqBody) => (body = reqBody))

      await Story.update({
        story: fakeStory(),
        updates: { state: '$next' },
      })

      expect(body).toEqual({ current_state: '$next' })
    })

    it('is not updated when it is empty in changes', async () => {
      let body
      reqPutPivotal.reply(200, (url, reqBody) => (body = reqBody))

      await Story.update({
        story: fakeStory(),
        updates: { state: null },
      })

      expect(body).toBe(undefined)
    })
  })
})

describe('.getWithPulls', () => {
  it('is a function', () => {
    expect(Story.getWithPulls).toBeInstanceOf(Function)
  })
})

// HELPERS

function fakeStory(updates) {
  return require('lodash').merge(
    {
      id: 895,
      projectId: 17,
      currentState: 'test',
      reviews: [],
    },
    updates,
  )
}

function fakeStoryReview(updates) {
  return require('lodash').merge({}, updates)
}
