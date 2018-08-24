
const http = require("http");
const request = require("request");
const archiver = require("archiver");
const url = require("url");

function download(entries, current, archive, response) {
  if(current >= entries.length) {
    archive.finalize();

    return;
  }

  const entry = entries[current];

  request.get({ url: entry.url, encoding: null }, function(err, response, body) {
    download(entries, current + 1, archive, response);
  }).on("response", function(response) {
    archive.append(response, { name: entry.filename });
  });
}

function handleRequest(req, res) {
  const archive = archiver("zip");
  const reqUrl = new url.URL(req.url, "http://localhost/")
  
  if(reqUrl.pathname === "/download") {
    if(reqUrl.searchParams.get("token") !== process.env.TOKEN) {
      res.writeHead(403);
      res.end();

      return;
    }

    request(reqUrl.searchParams.get("url"), function(err, response, body) {
      if(err) {
        res.writeHead(500);
        res.end();

        return;
      }

      let entries = null;

      try {
        entries = body.toString().split(/\n/).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line));
      } catch(e) {
        res.writeHead(422);
        res.end();

        return;
      }

      res.writeHead(200, { "content-type": "application/zip" });

      archive.pipe(res);

      download(entries, 0, archive, res);
    });
  } else if(reqUrl.pathname === "/status") {
    res.writeHead(200);
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
}

const server = http.createServer(handleRequest);

server.on("clientError", function(err, socket) {
  console.error("clientError");
  console.error(err);

  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(8080, "0.0.0.0");

