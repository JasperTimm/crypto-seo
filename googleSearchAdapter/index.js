const { Requester, Validator } = require('@chainlink/external-adapter')
const  googleIt = require('google-it')

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  term: true,
  site: true,
  domainMatch: false,
  engine: false
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(input, customParams)

  if (validator.error) {
    callback(validator.error.statusCode, validator.error)
    return
  }
  const jobRunID = validator.validated.id
  const term = validator.validated.data.term.toLowerCase()
  const site = new URL(validator.validated.data.site.toLowerCase())
  const domainMatch = validator.validated.data.domainMatch || false
  const engine = validator.validated.data.engine || 'google'

  googleIt({"query": term}).then(results => {
    var siteRank = 0
    for (var i = 0; i < results.length; i++) {
      var resURL = new URL(results[i].link)
      if ((domainMatch && resURL.hostname == site.hostname) ||
       resURL.href == site.href) {
         siteRank = i + 1
         continue
      }
    }

    // It's common practice to store the desired value at the top-level
    // result key. This allows different adapters to be compatible with
    // one another.
    var response = {
      data: { rank: siteRank, result: siteRank },
      status: 200,
      result: siteRank
    }

    callback(response.status, Requester.success(jobRunID, response))
  }).catch(err => {
    console.error(err)
    callback(500, Requester.errored(jobRunID, error))
  })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
