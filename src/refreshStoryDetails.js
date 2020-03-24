const _ = require('lodash')
const Story = require('./services/Story')
const Pull = require('./services/Pull')
const buildStoryDetails = require('./utils/buildStoryDetails')

const combineStoryPullsAndInitiator = (pulls, initiator) =>
  _.uniqWith([...pulls, initiator], _.isEqual).filter(Boolean)

module.exports = async ({ storyId, initiator, context }) => {
  const story = await Story.getWithPulls(storyId)
  const pullsParams = combineStoryPullsAndInitiator(
    story.pullsParams,
    initiator,
  )

  const pulls = await Promise.all(
    pullsParams.map(pullParams => Pull.get(context, pullParams)),
  )

  const nextDetails = buildStoryDetails({ story, pulls })

  await Story.update({ story, updates: nextDetails })
}
