const fs = require('fs')
const path = require('path')
const express = require('express')



const app = express()

const suggests = {
  a: 'example',
  ab: 'world',
  abc: 'green',
  abcd: 'book',
}

app.get('/api', (req, res) => {
  const q = req.query.q

  setTimeout(() => {
    res.json({ suggest: suggests[q] || 'unknown' })
  }, 3000)
})

app.get('/', (req, res) => {
  const htmlPath = path.resolve(__dirname, './index.html')
  const htmlContent = fs.readFileSync(htmlPath, 'utf8')

  res.send(htmlContent)
})

app.listen(3000, () => console.log('http://localhost:3000'))
