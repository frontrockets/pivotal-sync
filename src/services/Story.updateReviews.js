const _ = require('lodash')

const mapRepoToReview = {
  'user-platform': 'PR:user',
  'business-platform': 'PR:biz',
  'web-services': 'PR:services',
}

module.exports = async function updateReviews({
  story,
  updates,
  request,
  getProjectReviewTypes,
  getProjectMembers,
}) {
  const [reviewTypes, members] = await Promise.all([
    getProjectReviewTypes(story.projectId),
    getProjectMembers(story.projectId),
  ])

  const DEFAULT_REVIEW_TYPE_NAME = 'Code'

  const repoNameToReviewTypeName = name => mapRepoToReview[name] || `PR:${name}`

  const findReviewTypeByRepo = name =>
    reviewTypes.find(type => type.name === repoNameToReviewTypeName(name)) ||
    reviewTypes.find(type => type.name === DEFAULT_REVIEW_TYPE_NAME) ||
    {}

  const findMemberByName = name =>
    members.find(member => member.username === name) || {}

  const staleReviews = []
  const newReviews = []
  const modifiedReviews = []

  const nextReviews = _(updates.reviewsPerRepo)
    .mapKeys((value, key) => findReviewTypeByRepo(key).id)
    .mapValues(value => _.mapKeys(value, (x, key) => findMemberByName(key).id))
    .transform((result, value, key) => {
      _.mapKeys(value, (status, uid) => {
        result.push({
          review_type_id: key,
          reviewer_id: uid,
          status,
        })
      })
    }, [])
    .value()

  staleReviews.push(
    ...story.reviews.filter(
      review =>
        !_.find(nextReviews, _.pick(review, 'review_type_id', 'reviewer_id')),
    ),
  )

  nextReviews.forEach(review => {
    const existingReview = _.find(
      story.reviews,
      _.pick(review, 'review_type_id', 'reviewer_id'),
    )

    if (existingReview && existingReview.status !== review.status) {
      modifiedReviews.push({
        id: existingReview.id,
        status: review.status,
      })
    }

    if (!existingReview) {
      newReviews.push(review)
    }
  })

  const requests = [
    ...staleReviews.map(review =>
      request.delete(`stories/${story.id}/reviews/${review.id}`),
    ),
    ...newReviews.map(review =>
      request.post(`stories/${story.id}/reviews`, review),
    ),
    ...modifiedReviews.map(review =>
      request.put(`stories/${story.id}/reviews/${review.id}`, {
        status: review.status,
      }),
    ),
  ]

  return Promise.all(requests)
}
