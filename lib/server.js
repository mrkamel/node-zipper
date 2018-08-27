
const http = require("http");
const https = require("https");
const request = require("request");
const archiver = require("archiver");
const crypto = require("crypto");
const url = require("url");

function download(entries, current, archive) {
  if(current >= entries.length) {
    archive.finalize();

    return;
  }

  const entry = entries[current];
  const scheme = entry.url.match(/^https:/) ? https : http;

  try {
    scheme.get(entry.url, function(resp) {
      archive.append(resp, { name: entry.filename });

      resp.on("end", function() {
        download(entries, current + 1, archive);
      });
    });
  } catch(e) {
    console.log(e);

    download(entries, current + 1, archive);
  }
}

function handleRequest(req, res) {
  try {
    const archive = archiver("zip");
    const reqUrl = new url.URL(req.url, "http://localhost/")
    
    if(reqUrl.pathname === "/download") {
      const signature = crypto.createHash("sha256").update(`${process.env.TOKEN}:${reqUrl.searchParams.get("url")}`).digest().toString("hex");

      if(signature !== reqUrl.searchParams.get("signature")) {
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

        res.writeHead(200, { "content-type": `application/zip; filename=${reqUrl.searchParams.get("filename") || "file.zip"}` });

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
  } catch(e) {
    console.log(e);

    res.writeHead(500);
    res.end();
  }
}

this.server = http.createServer(handleRequest);

this.server.on("clientError", function(err, socket) {
  console.error("clientError");
  console.error(err);

  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

exports.listen = function() {
  this.server.listen(8080, "0.0.0.0");
}

exports.close = function() {
  this.server.close();
}

