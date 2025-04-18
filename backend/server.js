const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { rateLimit } =require("express-rate-limit");

const app = express();
app.set("trust proxy", 1); 

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["POST", "GET"],
};

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 80, // Limit each IP to 80 requests per minute
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use(limiter); // Apply the rate limiting middleware to all requests

app.use(cors(corsOptions));
app.use(express.json());

const getProblems = () => {
  const data = fs.readFileSync(path.join(__dirname, "problems.json"));
  return JSON.parse(data);
};

// app.post("/run", (req, res) => {
//   const problems = getProblems();
//   const { problem, input } = req.body;

//   if (!problems[problem]) {
//     return res.status(400).json({ error: "Invalid problem" });
//   }

//   const executablePath = path.join(__dirname, problems[problem].executable);

//   const process = spawn(executablePath);
//   let output = "",
//     errorOutput = "";

//   process.stdout.on("data", (data) => {
//     output += data.toString();
//   });

//   process.stderr.on("data", (data) => {
//     errorOutput += data.toString();
//   });

//   process.on("close", (code) => {
//     res.json({
//       output: code !== 0 ? "Invalid input" + errorOutput : output.trim(),
//     });
//   });

//   process.stdin.write(input + "\n");
//   process.stdin.end();
// });


app.post("/run", (req, res) => {
  const problems = getProblems();
  const { problem, input } = req.body;

  if (!problems[problem]) {
    return res.status(400).json({ error: "Invalid problem" });
  }

  const executablePath = path.join(__dirname, problems[problem].executable);

  // Grant execute permission
  exec(`chmod +x ${executablePath}`, (err) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Permission error: " + err.message });
    }

    const process = spawn(executablePath);
    let output = "",
      errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      res.json({
        output: code !== 0 ? "Invalid input " + errorOutput : output.trim(),
      });
    });

    process.stdin.write(input + "\n");
    process.stdin.end();
  });
});



app.get("/problems", (req, res) => {
  //console.log("fetched");
  res.json(getProblems());
});


//--------deployment-----------
const __dirname1 = path.resolve();
app.use(express.static(path.join(__dirname1, "/frontend/build")));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname1,"frontend","build","index.html"));
})
//--------deployment-----------
app.listen(5000, () => console.log("Server running"));
