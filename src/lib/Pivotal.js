const axios = require('axios')

module.exports.setStoryState = (id, state) => {
  const data = { current_state: state }

  return axios
    .put(`https://www.pivotaltracker.com/services/v5/stories/${id}`, data, {
      headers: {
        'X-TrackerToken': process.env.PIVOTAL_TOKEN || '',
      },
    })
    .catch(error => console.log(error))
}
