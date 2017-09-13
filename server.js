// server.js
// where your node app starts

// init project
var express = require('express');
var mongo = require('mongodb').MongoClient;
var app = express();
var dburl = 'mongodb://mahwang:'+ process.env.DBPASSWORD + '@ds135364.mlab.com:35364/fcc-urlshortener';
var Bing = require('node-bing-api')({ accKey: process.env.BING_API_KEY });

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('To do an image search, use the url /api/imagesearch/-search term-?offset=-offset-. To see a list of recent searches, use the url /api/recentsearches.')
});

//Need: image URL, alt text, page URL
app.get('/api/imagesearch/*', (req, res) => {
  var path = req.path.split('/api/imagesearch/')[1];
  var offset = req.query.offset;
  
  Bing.images(path, (err, result, body) => {
    if (err) res.send('Error');
    displayResults(body, offset, (err, data) => {
      saveSearch(path, offset, (err, data) => {
        if (err) res.send('Error');
      });
      res.send(data);
    });
  });
});

function displayResults(body, offset, callback){
  if (isNaN(+offset)) { return callback('Offset is not a number!') }
  if (offset == null || offset <= 0) { offset = 0; }
  else if (offset != 1) { offset--; }
  var min = 1 + (offset*10);
  var max = 10 + (offset*10);
  var data = [];
  for(var i=min-1;i<max;i++){
    var d = {};
    d.name = body.value[i].name;
    d.imageURL = body.value[i].contentUrl;
    d.pageURL = body.value[i].hostPageUrl;
    data.push(d);
  }
  return callback(null, data);
}

app.get('/api/recentsearches', (req, res) => {
  getRecentSearches((err, docs) => {
    if(err) { res.send(err) }
    res.send(docs);
  })
});

//save search term and date
function saveSearch(query, offset, callback){
  mongo.connect(dburl, (err, db) => {
    if (err) return callback(err);
    var coll = db.collection('imagesearches');
    
    coll.insertOne({
      'term': query,
      'date': new Date().valueOf()
    }, (err, res) => {
      if (err) return callback(err);
      db.close();
    })
  });
}

function getRecentSearches(callback){
  mongo.connect(dburl, (err, db) => {
    if (err) return callback(err);
    var coll = db.collection('imagesearches');
    
    coll.find().sort({
      date: 1
    }).limit(10).project({
      term: 1,
      date: 1,
      _id: 0
    }).toArray((err, docs) => {
      if (err) return callback(err);
      //map function to convert date into readable date for display
      var map = docs.map((doc) => {
        var d = new Date(doc.date);
        doc.date = d.toString();
      });
      return callback(null, docs);
    });
  });
}





// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
