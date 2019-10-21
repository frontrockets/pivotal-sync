const _ = require('lodash')

const extractPivotalLink = require('./lib/extractPivotalLink')
const Pivotal = require('./lib/Pivotal')

const status = {
  UNSTARTED: 'unstarted',
  IN_PROGRESS: 'in_review',
  APPROVED: 'pass',
  REJECTED: 'revise',
}

const getPull = context => {
  const originalPull = context.issue()

  return _.omit({ ...originalPull, pull_number: originalPull.number }, 'number')
}

const getReviews = context =>
  context.github.pulls
    .listReviews(getPull(context))
    .then(result =>
      result.data.sort(
        (a, b) =>
          new Date(b.submitted_at).valueOf() -
          new Date(a.submitted_at).valueOf(),
      ),
    )

const createHandlerWithStoryId = callback => async context => {
  const { body, state, labels } = context.payload.pull_request

  if (state === 'closed' || labels.some(label => label.name === 'WIP')) {
    return null
  }

  const storyLink = extractPivotalLink(body)

  if (storyLink.id) {
    await callback(context, storyLink.id)
  }
}

const getCurrentStatusForReviews = (reviews, login) => {
  const reviewsByLogin = reviews
    .filter(review => review.user.login === login)
    .map(review => ({
      ...review,
      state: _.toUpper(review.state),
    }))

  const githubReviewStateToStatus = {
    APPROVED: status.APPROVED,
    CHANGES_REQUESTED: status.REJECTED,
    COMMENTED: status.IN_PROGRESS,
  }

  const hasPreviousReview = reviewsByLogin.length > 0

  if (hasPreviousReview) {
    const approvalOrRejectionReview = reviewsByLogin.find(review =>
      ['APPROVED', 'CHANGES_REQUESTED'].includes(review.state),
    )

    if (approvalOrRejectionReview) {
      return githubReviewStateToStatus[approvalOrRejectionReview.state]
    }

    const commentReview = reviewsByLogin.find(
      review => review.state === 'COMMENTED',
    )

    if (commentReview) {
      return githubReviewStateToStatus.COMMENTED
    }
  }

  return null
}

module.exports = app => {
  app.on(
    'pull_request.review_requested',
    createHandlerWithStoryId(async (context, id) => {
      const { login } = context.payload.requested_reviewer

      const existedReviews = await getReviews(context)

      const hasPreviousReview = !!existedReviews.find(
        review => review.user.login === login,
      )

      if (hasPreviousReview) {
        return Pivotal.setStoryReviews(id, login, status.IN_PROGRESS)
      }

      return Pivotal.setStoryReviews(id, login, status.UNSTARTED)
    }),
  )

  app.on(
    'pull_request.review_request_removed',
    createHandlerWithStoryId(async (context, id) => {
      const { login } = context.payload.requested_reviewer

      const existedReviews = await getReviews(context)

      const nextStatus = getCurrentStatusForReviews(existedReviews, login)

      return Pivotal.setStoryReviews(id, login, nextStatus)
    }),
  )

  app.on(
    'pull_request_review.submitted',
    createHandlerWithStoryId(async (context, id) => {
      const { review } = context.payload
      const login = review.user.login

      const existedReviews = await getReviews(context)

      const nextStatus = getCurrentStatusForReviews(existedReviews, login)

      if (!nextStatus) {
        return Pivotal.setStoryReviews(id, login, status.UNSTARTED)
      }

      return Pivotal.setStoryReviews(id, login, nextStatus)
    }),
  )

  app.on(
    'pull_request_review.dismissed',
    createHandlerWithStoryId(async (context, id) => {
      const { user } = context.payload.review
      const login = user.login

      const existedReviews = await getReviews(context)

      const nextStatus = getCurrentStatusForReviews(existedReviews, login)

      if (!nextStatus) {
        return Pivotal.setStoryReviews(id, login, status.IN_PROGRESS)
      }

      return Pivotal.setStoryReviews(id, login, nextStatus)
    }),
  )
}
