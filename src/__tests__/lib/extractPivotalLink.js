const extractPivotalLink = require('../../lib/extractPivotalLink')

const storyLinkFull = id => `https://www.pivotaltracker.com/story/show/${id}`

it('returns empty object for empty text', () => {
  const link = extractPivotalLink('')

  expect(link).toEqual({})
})

it("finds the link when it's the only in text", () => {
  const id = '1'
  const url = storyLinkFull(id)
  const link = extractPivotalLink(url)

  expect(link).toEqual({ url, id })
})

it('finds the link in the middle of text', () => {
  const id = '1'
  const url = storyLinkFull(id)
  const link = extractPivotalLink(`Before\n\n${url}\n\nAfter`)

  expect(link).toEqual({ url, id })
})

it('finds the first link in the text', () => {
  const id = '1'
  const url = storyLinkFull(id)
  const link = extractPivotalLink(
    `Before\n\n${url}\n\n${storyLinkFull(2)}\n\nAfter`,
  )

  expect(link).toEqual({ url, id })
})
