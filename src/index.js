const extractPivotalLink = require('./lib/extractPivotalLink')
const Pivotal = require('./lib/Pivotal')

module.exports = app => {
  app.on('pull_request.closed', context => {
    const { body, merged } = context.payload.pull_request

    if (merged) {
      const storyLink = extractPivotalLink(body)

      if (storyLink.id) {
        Pivotal.setStoryState(storyLink.id, 'delivered')
      }
    }
  })
}
