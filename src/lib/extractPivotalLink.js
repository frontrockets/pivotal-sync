module.exports = (input = '') => {
  const match = input.match(/[^\s]*pivotaltracker\.com\/story\/show\/(\d+)/)

  if (match) {
    return { url: match[0], id: match[1] }
  }

  return {}
}
