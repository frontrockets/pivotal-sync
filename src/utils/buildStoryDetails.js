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
    .mapValues(values =>
      values.sort(makeMergedFirst).reduce((acc, value) => {
        if (value.isWip) {
          return acc
        }

        return { ...acc, ...convertGhReviewsToPivotal(value.reviewsByUser) }
      }, {}),
    )
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

const makeMergedFirst = (first, second) => {
  if (first.isMerged && !second.isMerged) {
    return -1
  }

  if (!first.isMerged && second.isMerged) {
    return 1
  }

  return 0
}
