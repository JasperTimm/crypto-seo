const { Requester, Validator } = require('@chainlink/external-adapter')
const fetch = require('node-fetch')
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SEARCH_ENG_ID = process.env.SEARCH_ENG_ID

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

const search = (term, site, domainMatch, start) => {
  if (start == null) start = 1
  return new Promise((resolve) => {
    if (start > 100) return resolve(0)
    return resolve(fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENG_ID}&q=${term}&fields=items(link)&start=${start}`)
      .then(res => res.json())
      .then(res => {
        console.log(`start: ${start} to ${start + 10}`)
        console.log(res)
        let rank = res.items.findIndex(item => {
          let url = new URL(item.link)
          return ((domainMatch && url.hostname == site.hostname) ||
            url.href == site.href)
        })
        if (rank >= 0) return rank + start
        return search(term, site, domainMatch, start + 10)
    }))
  })
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
  // Will look at handling other search engines in the future
  const engine = validator.validated.data.engine || 'google'

  search(term, site, domainMatch)
    .then(siteRank => {
      // It's common practice to store the desired value at the top-level
      // result key. 
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
