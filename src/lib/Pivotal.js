const axios = require('axios')

const request = axios.create({
  baseURL: 'https://www.pivotaltracker.com/services/v5/',
  headers: {
    'X-TrackerToken': process.env.PIVOTAL_TOKEN || '',
  },
})

module.exports.setStoryState = (id, state) => {
  const data = { current_state: state }

  return request.put(`stories/${id}`, data).catch(error => console.log(error))
}

module.exports.setStoryReviews = async (id, issueReviewers) => {
  const REVIEW_TYPE_NAME = 'Code'

  const projectId = await request
    .get(`stories/${id}`)
    .then(result => result.data.project_id)

  const reviewType = await request
    .get(`projects/${projectId}?fields=review_types`)
    .then(result =>
      result.data.review_types.find(item => item.name === REVIEW_TYPE_NAME),
    )

  const members = await request
    .get(`projects/${projectId}/memberships`)
    .then(result =>
      result.data.map(item => ({
        id: item.person.id,
        name: item.person.name,
        email: item.person.email,
        username: item.person.username,
      })),
    )

  const deleteReviews = []
  const createReviews = []
  const updateReviews = []

  const currentReviews = await request
    .get(`projects/${projectId}/stories/${id}/reviews`)
    .then(result => result.data)

  currentReviews.forEach(currentReview => {
    const username = members.find(
      member => member.id === currentReview.reviewer_id,
    ).username

    if (!issueReviewers[username]) {
      deleteReviews.push({
        review_type_id: reviewType.id,
        review_id: currentReview.id,
      })
    } else {
      updateReviews.push({
        review_type_id: reviewType.id,
        review_id: currentReview.id,
        status: issueReviewers[username],
      })
    }
  })

  Object.keys(issueReviewers).forEach(issueReviewer => {
    const member = members.find(item => item.username === issueReviewer)
    const hasExistingReview = !!currentReviews.find(
      currentReview => currentReview.reviewer_id === member.id,
    )

    if (member && !hasExistingReview) {
      createReviews.push({
        review_type_id: reviewType.id,
        reviewer_id: member.id,
        status: issueReviewers[issueReviewer],
      })
    }
  })

  await Promise.all([
    ...deleteReviews.map(({ review_id, ...update }) =>
      request.delete(
        `projects/${projectId}/stories/${id}/reviews/${review_id}`,
        update,
      ),
    ),
    ...createReviews.map(update =>
      request.post(`projects/${projectId}/stories/${id}/reviews`, update),
    ),
    ...updateReviews.map(({ review_id, ...update }) =>
      request.put(
        `projects/${projectId}/stories/${id}/reviews/${review_id}`,
        update,
      ),
    ),
  ])
}
