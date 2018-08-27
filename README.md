
# Zipper

Zipper is a tiny nodejs app, which takes a URL pointing to a json file that
lists files (URLs) you want to generate a zipfile for while streaming it to
your client.

# Use case

Say, you want to provide your users a way to download a number of files, e.g.
large images or arbitrary blobs. You can implement this by generating a zipfile
in background workers, upload it to e.g. S3 and point the user to this uploaded
file. However, if the zip is comprised of many large files, your workers will
be blocked for a long time and the user has to wait for the actual upload
before he/she can start downloading the file. Streaming the zipfile from within
your frontend is probably not possible as well, due to timeouts, memory issues,
missing streaming support, etc. Using zipper, you can offload the zip file
generation and streaming from your app, by a) uploading a multiline json file to
e.g. `http://url.to/file.json`:

```
{ filename: "filename1.jpg", url: "http://url.to/filename1.jpg" }
{ filename: "filename2.jpg", url: "http://url.to/filename2.jpg" }
...
```
and b) redirecting the user to zipper while pointing to the uploaded file:

`http://zipper.host:8080/generate?signature=SIGNATURE&url=http://url.to/file.json&filename=file.zip`

Zipper will then download the file, download the listed files one after another
while generating a zip file and stream it to the user as `file.zip`.

# Installation

```
$ npm install
$ TOKEN=SECRET_TOKEN node app.js
```

# Signature

The signature is build and checked via `sha256(token + ":" + url)`

