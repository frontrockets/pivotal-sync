const _ = require('lodash')

const storyState = {
  DELIVERED: 'delivered',
  FINISHED: 'finished',
}

const mapGhReviewsToPivotal = {
  APPROVED: 'pass',
  COMMENTED: 'in_review',
  CHANGES_REQUESTED: 'revise',
  NEW: 'unstarted',
}

module.exports = ({ story, pulls }) => {
  const state =
    isEveryPullMerged(pulls) && isCurrentStateFinished(story)
      ? storyState.DELIVERED
      : null

  const reviewsPerRepo = _(pulls)
    .groupBy('repoName')
    .mapValues(([value]) => {
      if (value.isWip) {
        return {}
      }

      return convertGhReviewsToPivotal(value.reviewsByUser)
    })
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

const isCurrentStateFinished = story =>
  story.currentState === storyState.FINISHED
