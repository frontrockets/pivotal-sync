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

const getStory = id => request.get(`stories/${id}`).then(result => result.data)

const getReviewType = (projectId, reviewTypeName) =>
  request
    .get(`projects/${projectId}?fields=review_types`)
    .then(result =>
      result.data.review_types.find(item => item.name === reviewTypeName),
    )

const getMembers = projectId =>
  request.get(`projects/${projectId}/memberships`).then(result =>
    result.data.map(item => ({
      id: item.person.id,
      username: item.person.username,
    })),
  )

const getStoryReviews = (id, projectId) =>
  request
    .get(`projects/${projectId}/stories/${id}/reviews`)
    .then(result => result.data)

module.exports.setStoryReviews = async (id, login, status) => {
  const REVIEW_TYPE_NAME = 'Code'

  const story = await getStory(id)

  const [reviewType, members, storyReviews] = await Promise.all([
    getReviewType(story.project_id, REVIEW_TYPE_NAME),
    getMembers(story.project_id),
    getStoryReviews(id, story.project_id),
  ])

  const member = members.find(member => member.username === login)

  if (member) {
    // We don't allow reviews for own stories
    if (story.owner_ids.includes(member.id)) {
      return false
    }

    const storyReviewForMember = storyReviews.find(
      review => review.reviewer_id === member.id,
    )

    if (status === null) {
      if (storyReviewForMember) {
        return request.delete(
          `projects/${story.project_id}/stories/${id}/reviews/${storyReviewForMember.id}`,
        )
      }
    } else {
      const data = {
        review_type_id: reviewType.id,
        reviewer_id: member.id,
        status,
      }

      if (storyReviewForMember) {
        return request.put(
          `projects/${story.project_id}/stories/${id}/reviews/${storyReviewForMember.id}`,
          data,
        )
      } else {
        return request.post(
          `projects/${story.project_id}/stories/${id}/reviews`,
          data,
        )
      }
    }
  }
}
