module.exports = function updateStatus({ story, updates, request }) {
  return request
    .put(`stories/${story.id}`, { current_state: updates.state })
    .catch(error => console.log(error))
}
