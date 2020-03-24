const _ = require('lodash')

const LABEL_WIP = 'WIP'
const STATE_APPROVED = 'APPROVED'
const STATE_CHANGES_REQUESTED = 'CHANGES_REQUESTED'
const STATE_COMMENTED = 'COMMENTED'
const STATE_NEW = 'NEW'

const getAllReviews = async (context, params) => {
  const reviews = await context.github.pulls
    .listReviews({
      ...params,
      per_page: 100,
    })
    .then(response => response.data)

  return reviews.map(review => ({
    id: review.id,
    user: review.user.login,
    state: review.state,
  }))
}

module.exports.get = async (context, params) => {
  const pull = await context.github.pulls
    .get(params)
    .then(response => response.data)

  const reviews = await getAllReviews(context, params)

  injectNewReviewRequests({ reviews, pull })

  return {
    isMerged: pull.merged || false,
    isWip: isWip(pull),
    repoName: _.get(pull, 'head.repo.name'),
    repoFullName: _.get(pull, 'head.repo.full_name'),
    reviewsByUser: getReviewStatesByUser({ reviews, author: pull.user.login }),
  }
}

const injectNewReviewRequests = ({ reviews, pull }) => {
  const requestsWithStates = _.map(pull.requested_reviewers, request => ({
    user: request.login,
    state: STATE_NEW,
  }))

  reviews.push(...requestsWithStates)
}

const getReviewStatesByUser = ({ reviews, author }) => {
  const result = {}

  _(reviews)
    .reverse()
    .groupBy('user')
    .omit(author)
    .mapValues(reviews => reviews.map(_.property('state')))
    .each((states, user) => {
      const newReview = states.find(state => state === STATE_NEW)
      const approvalOrRejectionReview = states.find(state =>
        [STATE_APPROVED, STATE_CHANGES_REQUESTED].includes(state),
      )

      if (newReview) {
        result[user] = newReview
      } else if (approvalOrRejectionReview) {
        result[user] = approvalOrRejectionReview
      } else if (states.includes(STATE_COMMENTED)) {
        result[user] = STATE_COMMENTED
      }
    })

  return result
}

const isWip = pull =>
  Boolean(pull.labels.find(label => label.name === LABEL_WIP)) ||
  pull.draft ||
  false
