const extractPivotalLink = require('./extractPivotalLink')

function isPullRequestWip(context) {
  const { labels } = context.payload.pull_request

  return labels.some(label => label.name === 'WIP')
}

module.exports.policyAll = (policies, callback) => async context => {
  let allowed = false
  for (let policy of policies) {
    allowed = policy(context)

    if (!allowed) {
      break
    }
  }

  if (allowed) {
    return await callback(context)
  }
}

module.exports.policyNotClosed = context => {
  const { state } = context.payload.pull_request

  return state !== 'closed'
}

module.exports.policyWithStoryId = context => {
  const { body } = context.payload.pull_request

  const storyLink = extractPivotalLink(body)

  if (storyLink.id) {
    context.storyLinkId = storyLink.id
    return true
  }
}

module.exports.policyNotWip = context => !isPullRequestWip(context)

module.exports.policyWip = context => isPullRequestWip(context)
