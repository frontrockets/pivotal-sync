const nock = require('nock')

const Pivotal = require('../../lib/Pivotal')

const apimock = nock('https://www.pivotaltracker.com/services/v5')

describe('where "setStoryState"', () => {
  it('sets state', async () => {
    expect.assertions(1)

    const id = 1
    const state = 'delivered'

    apimock
      .put(`/stories/${id}`, data => {
        expect(data).toEqual({ current_state: state })
        return true
      })
      .reply(200)

    await Pivotal.setStoryState(id, state)
  })
})

describe('where "setStoryReviews"', () => {
  const story_id = 1
  const project_id = 10
  const review_type_id = 20

  const masha_id = 100
  const pasha_id = 200

  beforeEach(() => {
    apimock.get(`/stories/${story_id}`).reply(200, {
      project_id,
      owner_ids: [pasha_id],
    })

    apimock
      .get(`/projects/${project_id}`)
      .query({ fields: 'review_types' })
      .reply(200, {
        review_types: [{ name: 'Code', id: review_type_id }],
      })

    apimock
      .get(`/projects/${project_id}/memberships`)
      .reply(200, [
        { person: { id: masha_id, username: 'masha' } },
        { person: { id: pasha_id, username: 'pasha' } },
      ])
  })

  describe('when there are no reviews by requested member', () => {
    beforeEach(() => {
      apimock
        .get(`/projects/${project_id}/stories/${story_id}/reviews`)
        .reply(200, [])
    })

    describe('for "unstarted" status', () => {
      const status = 'unstarted'

      it('creates new review', async () => {
        expect.assertions(1)

        apimock
          .post(`/projects/${project_id}/stories/${story_id}/reviews`, data => {
            expect(data).toEqual({
              review_type_id,
              reviewer_id: masha_id,
              status,
            })
            return true
          })
          .reply(200)

        await Pivotal.setStoryReviews(story_id, 'masha', status)
      })
    })

    describe('for "null" status', () => {
      it('does nothing', async () => {
        await Pivotal.setStoryReviews(story_id, 'masha', null)
      })
    })
  })

  describe('when there is a review by requested member', () => {
    const review_id = 1000

    beforeEach(() => {
      apimock
        .get(`/projects/${project_id}/stories/${story_id}/reviews`)
        .reply(200, [{ id: review_id, reviewer_id: masha_id }])
    })

    describe('for "in_review" status', () => {
      const status = 'in_review'

      it('updates the review', async () => {
        expect.assertions(1)

        apimock
          .put(
            `/projects/${project_id}/stories/${story_id}/reviews/${review_id}`,
            data => {
              expect(data).toEqual({
                review_type_id,
                reviewer_id: masha_id,
                status,
              })
              return true
            },
          )
          .reply(200)

        await Pivotal.setStoryReviews(story_id, 'masha', status)
      })
    })

    describe('for "null" status', () => {
      it('deletes the review', async () => {
        const scope = apimock
          .delete(
            `/projects/${project_id}/stories/${story_id}/reviews/${review_id}`,
          )
          .reply(200)

        await Pivotal.setStoryReviews(story_id, 'masha', null)

        scope.done()
      })
    })
  })

  describe('when there is no member with given username in the project', () => {
    const review_id = 1000

    beforeEach(() => {
      apimock
        .get(`/projects/${project_id}/stories/${story_id}/reviews`)
        .reply(200, [{ id: review_id, reviewer_id: masha_id }])
    })

    it('does nothing', async () => {
      await Pivotal.setStoryReviews(story_id, 'unknown', 'unstarted')
    })
  })

  describe('when the reviewer is the owner of story', () => {
    const review_id = 1000

    beforeEach(() => {
      apimock
        .get(`/projects/${project_id}/stories/${story_id}/reviews`)
        .reply(200, [])
    })

    it('does nothing', async () => {
      // If we run change request under inside, the test case is supposed to
      // be failed because it's not mocked
      await Pivotal.setStoryReviews(story_id, 'pasha', 'unstarted')
    })
  })
})
