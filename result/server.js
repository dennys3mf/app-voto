var express = require('express'),
    async = require('async'),
    { Pool } = require('pg'),
    cookieParser = require('cookie-parser'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

var port = process.env.PORT || 4000;

io.on('connection', function (socket) {

  socket.emit('message', { text : 'Welcome!' });

  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

var pool = new Pool({
  connectionString: 'postgres://postgres:postgres@db/postgres'
});

async.retry(
  {times: 1000, interval: 1000},
  function(callback) {
    pool.connect(function(err, client, done) {
      if (err) {
        console.error("Waiting for db");
      }
      callback(err, client);
    });
  },
  function(err, client) {
    if (err) {
      return console.error("Giving up");
    }
    console.log("Connected to db");
    getSimilarities(client);
  }
);


// My functions
function getSimilarities(client) {
  client.query('SELECT id, similarity FROM similarities', [], function(err, result) {
    if (err) {
      console.error("Error performing query: " + err);
    } else {
      var similarities = collectSimilaritiesFromResult(result);
      io.sockets.emit("similarities", JSON.stringify(similarities));
      console.log("Similarities:", JSON.stringify(similarities, null, 2));
    }

    setTimeout(function() { getSimilarities(client) }, 1000);
  });
}

function collectSimilaritiesFromResult(result) {
  var similarities = {};

  result.rows.forEach(function (row) {
    similarities[row.id] = row.similarity;
  });

  return similarities;
}

app.use(cookieParser());
app.use(express.urlencoded());
app.use(express.static(__dirname + '/views'));

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});