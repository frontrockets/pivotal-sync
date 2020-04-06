const axios = require('axios')

const request = axios.create({
  baseURL: 'https://www.pivotaltracker.com/services/v5/',
  headers: {
    'X-TrackerToken': process.env.PIVOTAL_TOKEN || '',
  },
})

const reData = /\n\n```!sync\n(.+)\n```/g

const inject = (content, data = {}) => {
  const sanitizedContent = content.replace(reData, '')
  const addition = data ? '\n\n```!sync\n' + JSON.stringify(data) + '\n```' : ''

  return `${sanitizedContent}${addition}`
}

const extractKey = description => {
  const meta = description.match(reData)

  if (meta) {
    return JSON.parse(meta.reverse()[0].replace(reData, '$1')).key
  }

  return null
}

const log = (...messages) => {
  console.log('>>>>', new Date())
  messages.forEach(message => console.log(message))
  console.log('')
}

module.exports = async function debounce(
  { groupLifeTime, waitTime, storyId, itemKey },
  action,
) {
  const getDescription = () =>
    request
      .get(`stories/${storyId}?fields=description`)
      .then(res => res.data.description)

  const putDescription = description =>
    request.put(`stories/${storyId}`, {
      description,
    })

  log('Debounce params:', {
    groupLifeTime,
    waitTime,
    storyId,
    itemKey,
  })

  let finalErrorMessage
  let finalDescription

  try {
    const data = {
      key: itemKey,
      at: Date.now(),
    }

    log('Get description')

    const description = await getDescription()

    log('Update description with:', data)

    await putDescription(inject(description, data))

    log('Start timer for:', waitTime)

    await new Promise(resolve => setTimeout(resolve, waitTime))

    log('Get next description')

    const nextDescription = await getDescription()

    const savedItemKey = extractKey(nextDescription)

    if (!savedItemKey || savedItemKey === itemKey) {
      log('Sync for key:', itemKey)
      finalDescription = nextDescription
      await action()
    } else {
      log('Ignore key:', itemKey)
    }
  } catch (error) {
    finalErrorMessage = error
  }

  log('Action is Done, cleaning meta')

  await putDescription(inject(finalDescription, null))

  if (finalErrorMessage) {
    throw new Error(finalErrorMessage)
  }

  log('Synced!')
}
