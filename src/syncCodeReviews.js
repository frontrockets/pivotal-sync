const _ = require('lodash')

const Pivotal = require('./lib/Pivotal')
const {
  policyAll,
  policyNotClosed,
  policyNotWip,
  policyWip,
  policyWithStoryId,
} = require('./lib/policies')

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

const getReviewsOnPullRequest = context =>
  context.github.pulls
    .listReviews(getPull(context))
    .then(result =>
      result.data.sort(
        (a, b) =>
          new Date(b.submitted_at).valueOf() -
          new Date(a.submitted_at).valueOf(),
      ),
    )

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
    policyAll(
      [policyNotClosed, policyNotWip, policyWithStoryId],
      async context => {
        const { login } = context.payload.requested_reviewer

        const existedReviews = await getReviewsOnPullRequest(context)

        const hasPreviousReview = !!existedReviews.find(
          review => review.user.login === login,
        )

        const storyLinkId = context.storyLinkId

        if (hasPreviousReview) {
          return Pivotal.setStoryReviews(storyLinkId, login, status.IN_PROGRESS)
        }

        return Pivotal.setStoryReviews(storyLinkId, login, status.UNSTARTED)
      },
    ),
  )

  app.on(
    'pull_request.review_request_removed',
    policyAll(
      [policyNotClosed, policyNotWip, policyWithStoryId],
      async context => {
        const { login } = context.payload.requested_reviewer

        const existedReviews = await getReviewsOnPullRequest(context)

        const nextStatus = getCurrentStatusForReviews(existedReviews, login)

        return Pivotal.setStoryReviews(context.storyLinkId, login, nextStatus)
      },
    ),
  )

  app.on(
    'pull_request_review.submitted',
    policyAll(
      [policyNotClosed, policyNotWip, policyWithStoryId],
      async (context, id) => {
        const { review } = context.payload
        const login = review.user.login

        const existedReviews = await getReviewsOnPullRequest(context)

        const nextStatus = getCurrentStatusForReviews(existedReviews, login)

        if (!nextStatus) {
          return Pivotal.setStoryReviews(
            context.storyLinkId,
            login,
            status.UNSTARTED,
          )
        }

        return Pivotal.setStoryReviews(context.storyLinkId, login, nextStatus)
      },
    ),
  )

  app.on(
    'pull_request_review.dismissed',
    policyAll(
      [policyNotClosed, policyNotWip, policyWithStoryId],
      async context => {
        const { user } = context.payload.review
        const login = user.login

        const existedReviews = await getReviewsOnPullRequest(context)

        const nextStatus = getCurrentStatusForReviews(existedReviews, login)

        if (!nextStatus) {
          return Pivotal.setStoryReviews(
            context.storyLinkId,
            login,
            status.IN_PROGRESS,
          )
        }

        return Pivotal.setStoryReviews(context.storyLinkId, login, nextStatus)
      },
    ),
  )

  app.on(
    'pull_request.labeled',
    policyAll(
      [policyNotClosed, policyWip, policyWithStoryId],
      async context => {
        const { requested_reviewers } = context.payload.pull_request

        return Promise.all(
          requested_reviewers.map(requestedReviewer =>
            Pivotal.setStoryReviews(
              context.storyLinkId,
              requestedReviewer.login,
              null,
            ),
          ),
        )
      },
    ),
  )
}
