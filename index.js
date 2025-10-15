const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const PORT = process.env.PORT || 3000;

function getLatestVersion() {
  const folderPath = path.join(__dirname, "artronic_firmware");

  try {
    const files = fs.readdirSync(folderPath);
    // Match V followed by 3 or 4 version parts (e.g., V1.2.3 or V1.2.3.4)
    const versionRegex = /V(\d+(?:\.\d+){2,3})/;
    let latestVersion = "0.0.0.0";

    files.forEach((file) => {
      const match = file.match(versionRegex);
      if (match) {
        const version = match[1];
        if (isNewerVersion(version, latestVersion)) {
          latestVersion = version;
        }
      }
    });

    return latestVersion;
  } catch (err) {
    console.error("Error reading firmware directory:", err);
    return null;
  }
}

// Compare version strings up to 4 digits
function isNewerVersion(version1, version2) {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  // Pad shorter versions with zeros so 3.9.3 == 3.9.3.0
  while (v1Parts.length < 4) v1Parts.push(0);
  while (v2Parts.length < 4) v2Parts.push(0);

  for (let i = 0; i < 4; i++) {
    if (v1Parts[i] > v2Parts[i]) return true;
    if (v1Parts[i] < v2Parts[i]) return false;
  }

  return false;
}


app.get("/check-update", (req, res) => {
  const { version } = req.query;
  const latestVersion = getLatestVersion();

  if (!latestVersion) {
    return res.status(500).json({ error: "Unable to determine the latest version." });
  }

  if (isNewerVersion(latestVersion, version)) {
    res.json({ updateAvailable: true, latestVersion });
  } else {
    res.json({ updateAvailable: false, latestVersion});
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
    zlib: { level: 9 } // Sets the compression level
  });

  archive.on("error", (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  archive.directory(folderPath, false);

  archive.finalize();
});

// 👇 Add this function below your other routes
app.get("/list-old-firmwares", (req, res) => {
  const folderPath = path.join(__dirname, "old_firmwares");

  try {
    if (!fs.existsSync(folderPath)) {
      return res.json({ oldFirmwares: [] });
    }

    const versions = fs.readdirSync(folderPath).filter((name) => {
      const fullPath = path.join(folderPath, name);
      return fs.statSync(fullPath).isDirectory();
    });

    const result = versions.map((version) => {
      const files = fs.readdirSync(path.join(folderPath, version));
      return { version, files };
    });

    res.json({ oldFirmwares: result });
  } catch (err) {
    console.error("Error reading old firmwares:", err);
    res.status(500).json({ error: "Unable to read old firmwares" });
  }
});

app.get("/download-old-firmware", (req, res) => {
  const { version } = req.query;

  if (!version) {
    return res.status(400).json({ error: "Please provide ?version=<firmwareVersion>" });
  }

  const folderPath = path.join(__dirname, "old_firmwares", version);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: `Firmware version ${version} not found.` });
  }

  // Set response headers
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=firmware_${version}.zip`
  );

  const archive = archiver("zip", {
    zlib: { level: 9 }
  });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  });

  archive.pipe(res);

  // Add all files inside the selected version folder
  archive.directory(folderPath, false);

  archive.finalize();
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
