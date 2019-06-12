const nock = require('nock')

const Pivotal = require('../../lib/Pivotal')

describe('where "setStoryState"', () => {
  it('sets state', async () => {
    expect.assertions(1)

    const id = 1
    const state = 'delivered'

    nock('https://www.pivotaltracker.com')
      .put(`/services/v5/stories/${id}`, (data, b) => {
        expect(data).toEqual({ current_state: state })
        return true
      })
      .reply(200)

    await Pivotal.setStoryState(id, state)
  })
})
