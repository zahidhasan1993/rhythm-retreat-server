const express = require("express");
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;



//middleware
app.use(cors());
app.use(express.json())


//server
app.get("/", (req, res) => {
  res.send("Welcome to Rhythm-retreat Server");
});

app.listen(port, () => {
  console.log("running on port", port);
});
