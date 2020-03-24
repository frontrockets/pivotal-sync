const _ = require('lodash')
const extractPivotalLink = require('./utils/extractPivotalLink')
const refreshStoryDetails = require('./refreshStoryDetails')

async function sync(context) {
  const { body } = context.payload.pull_request

  const storyLink = extractPivotalLink(body)
  const isPivotalLinkPresent = Boolean(storyLink.id)

  if (isPivotalLinkPresent) {
    await refreshStoryDetails({
      storyId: storyLink.id,
      initiator: {
        owner: _.get(context, 'payload.organization.login'),
        repo: _.get(context, 'payload.repository.name'),
        pull_number: _.get(context, 'payload.number'),
      },
      context,
    })
  }
}

module.exports = app => {
  app.on('pull_request.labeled', sync)
  app.on('pull_request.unlabeled', sync)
  app.on('pull_request.edited', sync)
  app.on('pull_request.review_requested', sync)
  app.on('pull_request.review_request_removed', sync)
  app.on('pull_request_review.submitted', sync)
  app.on('pull_request_review.dismissed', sync)
}
