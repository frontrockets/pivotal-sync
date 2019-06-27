const extractPivotalLink = require('./lib/extractPivotalLink')
const syncReviews = require('./lib/syncReviews')
const Pivotal = require('./lib/Pivotal')

module.exports = app => {
  app.on('pull_request.closed', async context => {
    const { body, merged } = context.payload.pull_request

    if (merged) {
      const storyLink = extractPivotalLink(body)

      if (storyLink.id) {
        await Pivotal.setStoryState(storyLink.id, 'delivered')
      }
    }
  })

  app.on('pull_request.review_request_removed', syncReviews)
  app.on('pull_request.review_requested', syncReviews)
  app.on('pull_request_review.submitted', syncReviews)
  app.on('pull_request_review.dismissed', syncReviews)
}
