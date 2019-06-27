const extractPivotalLink = require('./extractPivotalLink')
const Pivotal = require('./Pivotal')

module.exports = async context => {
  const { body, requested_reviewers } = context.payload.pull_request

  const storyLink = extractPivotalLink(body)

  if (storyLink.id) {
    const updates = {}

    const reviews = await context.github.pulls
      .listReviews(context.issue())
      .then(result => result.data)

    const allReviewers = reviews
      .map(review => review.user.login)
      .filter((value, index, self) => self.indexOf(value) === index)

    const requestedReviewers = requested_reviewers.map(item => item.login)

    const logins = [...allReviewers, ...requestedReviewers]

    logins.forEach(login => {
      const reviewsByThisReviewer = reviews
        .filter(review => review.user.login === login)
        .sort(
          (a, b) =>
            new Date(b.submitted_at).valueOf() -
            new Date(a.submitted_at).valueOf(),
        )

      const lastPassOrDenyReview = reviewsByThisReviewer.find(
        review =>
          review.state === 'APPROVED' || review.state === 'CHANGES_REQUESTED',
      )

      const lastReview = lastPassOrDenyReview
        ? lastPassOrDenyReview
        : reviewsByThisReviewer[0]

      let nextState = 'unstarted'

      if (lastReview) {
        nextState = 'in_review'

        if (lastReview.state === 'APPROVED') {
          nextState = 'pass'
        } else if (lastReview.state === 'CHANGES_REQUESTED') {
          nextState = 'revise'
        }
      }

      updates[login] = nextState
    })

    await Pivotal.setStoryReviews(storyLink.id, updates)
  }
}
