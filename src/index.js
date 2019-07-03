const syncStoryState = require('./syncStoryState')
const syncCodeReviews = require('./syncCodeReviews')

module.exports = app => {
  syncStoryState(app)
  syncCodeReviews(app)
}
