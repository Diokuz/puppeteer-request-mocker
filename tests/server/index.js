const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser)

const suggests = {
  a: 'example',
  ab: 'world',
  abc: 'green',
  abcd: 'book',
}

app.get('/api', (req, res) => {
  const q = req.query.q

  setTimeout(() => {
    res.set('Access-Control-Allow-Origin', '*')
    res.json({ suggest: suggests[q] || q })
  }, 300)
})

app.post('/api', (req, res) => {
  const q = req.body.q

  setTimeout(() => {
    res.set('Access-Control-Allow-Origin', '*')
    res.json({ suggest: suggests[q] || q })
  }, 100)
})

app.get('/', (req, res) => {
  const htmlPath = path.resolve(__dirname, './index.html')
  const htmlContent = fs.readFileSync(htmlPath, 'utf8')

  res.send(htmlContent)
})

app.get('/text', (req, res) => {
  res.send('<div id="text">text</div>')
})

app.listen(3000, () => console.log('http://localhost:3000'))
app.listen(4000, () => console.log('http://localhost:4000'))
