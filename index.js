const { toLambda } = require('probot-serverless-now')

const applicationFunction = require('./src')

module.exports = toLambda(applicationFunction)
