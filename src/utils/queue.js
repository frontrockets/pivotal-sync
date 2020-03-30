const fs = require('fs')

module.exports = async function queue({ maxTime, key }, action) {
  const filepath = `/tmp/pivotal-sync-${key}`

  const isInQueue = fs.existsSync(filepath)
  const isPrevReqSlow =
    isInQueue && Date.now() - fs.statSync(filepath).mtimeMs > maxTime

  if (!isInQueue || isPrevReqSlow) {
    fs.writeFileSync(filepath)

    let errorInAction
    try {
      await action()
    } catch (error) {
      errorInAction = error
    }

    fs.unlinkSync(filepath)

    if (errorInAction) {
      throw Error(errorInAction)
    }
  }
}
