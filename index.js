const express = require("express");
const path = require("path");
const fse = require("fs-extra");
const fs = require("fs").promises;
const fileupload = require("express-fileupload");

const SERVER_PORT = 3000;

const server = express();
server.use(fileupload());

server.get("/", async (req, res) => {
  const filesList = await getFiles(`${__dirname}/files`);
  let fileL = "<table>";
  filesList.forEach(el => {
      fileL += "<tr><td>";
      el = el.toString();
      el = el.replace(/.+(files)/, '');      
      fileL += el.toString();
      fileL += "</td></tr>";
  });
  fileL += "</table>";
  res.send(fileL);
});

server.get("*", async (req, res) => {
  if (req.method === 'GET')
  { 
    try {
      const path = req.path.slice(1);
      const absolutePath = `${__dirname}/files/${path}`;
      await fs.access(absolutePath);
      res.sendFile(absolutePath);
    } catch (e) {
      res.sendStatus(404);
    }
  }
  else if (req.method === 'HEAD')
  {
    try {
      const pathFile = req.path.slice(1);
      const absolutePath = `${__dirname}/files/${pathFile}`;
      await fs.access(absolutePath);
      
      const name = path.basename(req.path);
      res.setHeader('File', name);
      const dirname = path.dirname(req.path);
      res.setHeader('Directory-name', dirname);
      let extname = path.extname(req.path);
      extname = extname.slice(1);
      res.setHeader('Extention', extname);

      res.send(absolutePath);
    } catch (e) {
      res.sendStatus(404);
    }
  }
});

server.put("*", async (req, res) => {
  if (req.files) {
    const fileName = req.files.file.name;
    const path = req.path;
    await fse.ensureDir(`${__dirname}/files${path}`);
    fs.writeFile(`${__dirname}/files${path}/${fileName}`,
      req.files.file.data,
    );
    res.status(201).send("File download");
  } else {
    res.sendStatus(400);
  }
});

server.delete("*", async (req, res) => {
  const path = req.path.slice(1);
  
  try {
    if ((await fs.lstat(`${__dirname}/files/${path}`)).isDirectory())
      await fse.emptyDir(`${__dirname}/files/${path}`); 
    else 
      await fs.unlink(`files/${path}`);
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(404);
  }
});

server.post("*", async (req, res) => {
  const pathFile = req.headers["copyfrom"];
  if (pathFile) {
    const oldPath = `${__dirname}/files/${req.path.slice(1)}`;
    const newPath = `${__dirname}/files/${pathFile.slice(1)}`;

    const newPathDir = path.dirname(pathFile);
    await fse.ensureDir(`${__dirname}/files/${newPathDir}`);

    try {
      await fs.copyFile(oldPath, newPath);
      res.sendStatus(201);
    } catch (e) {
      res.sendStatus(404);
    }
  } else {
    res.sendStatus(400);
  }
});

server.listen(SERVER_PORT, () =>
  console.info(`Connect to server localhost:${SERVER_PORT}`),
);

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : (res + "\n") ;
    }),
  );
  return Array.prototype.concat(...files);
}