require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const dns = require('dns');
const { URL } = require('url');

const client = new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = client.db("urlshortener");
const urls = db.collection("urls");

app.use(bodyParser.urlencoded({ extended: false }))

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', function (req, res) {
  const url = req.body.url;
  const hostname = new URL(url).hostname;
  const dnsLookup = dns.lookup(hostname, async (err, address) => {
    if (err) {
      res.json({ error: "invalid url" });
      return;
    }

    // checking for existing document in database
    const existingDoc = await urls.findOne({ original_url: url });
    if (existingDoc) {
      res.json({ original_url: url, short_url: existingDoc.short_url });
      return;
    }

    // if doesn't exist in database then insert in db
    const urlCount = await urls.countDocuments({});
    const urlDoc = {
      original_url: url,
      short_url: urlCount
    }
    const result = await urls.insertOne(urlDoc);
    res.json({ original_url: url, short_url: urlCount })
  })
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shortUrl = req.params.short_url;
  const urlDoc = await urls.findOne({ short_url: +shortUrl });
  if (!urlDoc) {
    // Handle the case when no matching document is found
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }
  res.redirect(urlDoc.original_url);
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
