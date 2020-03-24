const _ = require('lodash')

const storyState = {
  DELIVERED: 'delivered',
}

const mapGhReviewsToPivotal = {
  APPROVED: 'pass',
  COMMENTED: 'in_review',
  CHANGES_REQUESTED: 'revise',
  NEW: 'unstarted',
}

module.exports = ({ pulls }) => {
  const state = isEveryPullMerged(pulls) ? storyState.DELIVERED : null

  const reviewsPerRepo = _(pulls)
    .filter(pull => !pull.isWip)
    .groupBy('repoName')
    .mapValues(value => convertGhReviewsToPivotal(value[0].reviewsByUser))
    .value()

  return {
    state,
    reviewsPerRepo,
  }
}

const convertGhReviewsToPivotal = object =>
  _.mapValues(object, value => mapGhReviewsToPivotal[value])

const isEveryPullMerged = pulls =>
  pulls.length ? pulls.every(pull => pull.isMerged) : false
