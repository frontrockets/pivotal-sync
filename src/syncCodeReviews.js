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
    policyAll([policyNotClosed, policyWithStoryId], async context => {
      const { requested_reviewers } = context.payload.pull_request

      if (context.payload.label.name === 'WIP') {
        const existingReviews = await getReviewsOnPullRequest(context)

        const logins = []

        requested_reviewers.forEach(requestedReviewer =>
          logins.push(requestedReviewer.login),
        )

        existingReviews.forEach(existingReview =>
          logins.push(existingReview.user.login),
        )

        return Promise.all(
          _.uniq(logins).map(login =>
            Pivotal.setStoryReviews(context.storyLinkId, login, null),
          ),
        )
      }
    }),
  )

  app.on(
    'pull_request.unlabeled',
    policyAll([policyNotClosed, policyWithStoryId], async context => {
      if (context.payload.label.name === 'WIP') {
        const getNewlyRequestedReviews = () => {
          return context.payload.pull_request.requested_reviewers.map(
            reviewer => ({ login: reviewer.login, status: status.UNSTARTED }),
          )
        }

        const getExistingReviews = async requestedReviewers => {
          const existingReviews = await getReviewsOnPullRequest(context)
          const existingReviewers = _.groupBy(existingReviews, 'user.login')

          return _.map(existingReviewers, (reviews, login) => {
            const hasPrevReviews = _.find(
              requestedReviewers,
              user => user.login === login,
            )
            const nextStatus = hasPrevReviews
              ? status.IN_PROGRESS
              : getCurrentStatusForReviews(reviews, login)

            return { login, status: nextStatus }
          })
        }

        const newRequests = getNewlyRequestedReviews()
        const existingReviews = await getExistingReviews(newRequests)

        const updates = _.unionBy(
          existingReviews,
          newRequests,
          _.property('login'),
        )

        return Promise.all(
          updates.map(update =>
            Pivotal.setStoryReviews(
              context.storyLinkId,
              update.login,
              update.status,
            ),
          ),
        )
      }
    }),
  )
}
