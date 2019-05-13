const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.get('/api', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json({title: 'response'})
});

app.get('/', (req, res) => {
  const htmlPath = path.resolve(__dirname, './index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  res.send(htmlContent)
});

app.listen(3000, () => console.log('http://localhost:3000'));