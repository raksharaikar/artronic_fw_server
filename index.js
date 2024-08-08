const express = require("express");
const app = express();
const path = require("path");
const archiver = require("archiver");
const PORT = process.env.PORT || 3000;

const currentVersion = 1;
const latestVersion = 6;

app.get("/check-update", (req, res) => {
  const { version } = req.query;
  if (parseInt(version, 10) < latestVersion) {
    res.json({ updateAvailable: true, latestVersion });
  } else {
    res.json({ updateAvailable: false });
  }
});

app.get("/download-update", (req, res) => {
  const folderPath = path.join(__dirname, "artronic_firmware");

  // Set response headers
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=artronic_firmware.zip",
  );

  const archive = archiver("zip", {
    zlib: { level: 9 },
    l,
  });

  archive.on("error", (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  archive.directory(folderPath, false);

  archive.finalize();
});

// app.get("/download-update", (req, res) => {
//   // Set the path to your video file
//   const filePath = path.join(__dirname, "artronic_firmware");
//   // Send the file as a response
//   res.download(filePath);
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
