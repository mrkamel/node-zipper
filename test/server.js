
const assert = require("assert");
const server = require("../lib/server");
const http = require("http");
const nock = require("nock");
const fs = require("fs");
const StreamZip = require('node-stream-zip');
const crypto = require("crypto");

describe("Server", function() {
  before(function() {
    process.env.TOKEN = "TOKEN";

    server.listen();
  });

  after(function() {
    server.close();
  });

  it("should return 200 for GET /status", function(done) {
    http.get("http://localhost:8080/status", function(res) {
      assert.equal(200, res.statusCode);
      done();
    });
  });

  it("should require authentication for GET /download", function(done) {
    http.get("http://localhost:8080/download?token=INCORRECT", function(res) {
      assert.equal(403, res.statusCode);
      done();
    });
  });

  it("should generate a zip for GET /download", function(done) {
    const url = "http://www.example.com/path/to/file";

    const mock = nock("http://www.example.com");

    mock.get("/path/to/file").reply(200,
      JSON.stringify({ filename: "file1.txt", url: "http://www.example.com/file1.txt" }) + "\n" +
      JSON.stringify({ filename: "file2.txt", url: "http://www.example.com/file2.txt" })
    );

    mock.get("/file1.txt").reply(200, "file1");
    mock.get("/file2.txt").reply(200, "file2");

    const signature = crypto.createHash("sha256").update(`TOKEN:stream.zip:${url}`).digest().toString("hex");

    http.get(`http://localhost:8080/download?signature=${signature}&url=${encodeURIComponent(url)}&filename=stream.zip`, function(res) {
      const file = "/tmp/file.zip";

      res.pipe(fs.createWriteStream("/tmp/file.zip", { encoding: "binary" }));

      res.on("end", function() {
        const zip = new StreamZip({
          file: "/tmp/file.zip",
          storeEntries: true
        });

        zip.on("ready", function() {
          assert.equal(2, zip.entriesCount);

          assert.equal("file1", zip.entryDataSync("file1.txt"));
          assert.equal("file2", zip.entryDataSync("file2.txt"));

          done();
        });
      });
    });
  });
});

