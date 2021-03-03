const createRequest = require('./index').createRequest

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.EA_PORT || 8080

app.use(bodyParser.json())

app.post('/request', (req, res) => {
  console.log('POST Data: ', req.body)
  createRequest(req.body, (status, result) => {
    console.log('Result: ', result)
    res.status(status).json(result)
  })
})

app.get('/search', (req, res) => {
  console.log('GET Data: ', req.query)
  createRequest({id:0, data: req.query}, (status, result) => {
    console.log('Result: ', result)
    res.status(status).json(result)
  })  
})

app.listen(port, () => console.log(`Listening on port ${port}!`))
