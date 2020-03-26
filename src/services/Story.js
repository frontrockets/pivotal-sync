const _ = require('lodash')
const axios = require('axios')

const updateStatus = require('./Story.updateStatus')
const updateReviews = require('./Story.updateReviews')

const request = axios.create({
  baseURL: 'https://www.pivotaltracker.com/services/v5/',
  headers: {
    'X-TrackerToken': process.env.PIVOTAL_TOKEN || '',
  },
})

const getStory = id => {
  const fields = [
    'current_state',
    'project_id',
    'owner_ids',
    'reviews',
    'pull_requests',
  ]

  return request
    .get(`stories/${id}?fields=${fields.join(',')}`)
    .then(result => result.data)
}

const getProjectReviewTypes = projectId =>
  request.get(`projects/${projectId}?fields=review_types`).then(result =>
    result.data.review_types
      .filter(item => !item.hidden)
      .map(item => ({
        id: item.id,
        name: item.name,
      })),
  )

const getProjectMembers = projectId =>
  request.get(`projects/${projectId}/memberships`).then(result =>
    result.data.map(item => ({
      id: item.person.id,
      username: item.person.username,
    })),
  )

module.exports.update = async ({ story, updates }) => {
  if (!_.isEmpty(updates.reviewsPerRepo)) {
    await updateReviews({
      story,
      updates,
      request,
      getProjectReviewTypes,
      getProjectMembers,
    })
  }

  if (updates.state) {
    await updateStatus({ story, updates, request })
  }
}

module.exports.getWithPulls = async storyId => {
  const story = await getStory(storyId)

  const pullsParams = story.pull_requests.map(pr => {
    const object = _.pick(pr, ['owner', 'repo', 'number'])

    _.set(object, 'pull_number', object.number)
    _.unset(object, 'number')

    return object
  })

  return {
    id: story.id,
    currentState: story.current_state,
    projectId: story.project_id,
    ownerIds: story.owner_ids,
    reviews: story.reviews,
    pullsParams,
  }
}
