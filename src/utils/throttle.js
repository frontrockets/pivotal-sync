const fs = require('fs')

module.exports = async function queue({ wait, key }, action) {
  const filepath = `/tmp/pivotal-sync-${key}`

  const isInQueue = fs.existsSync(filepath)
  const isPrevReqSlow =
    isInQueue && Date.now() - fs.statSync(filepath).mtimeMs > wait

  if (!isInQueue || isPrevReqSlow) {
    fs.writeFileSync(filepath)

    await action()
  }
}
