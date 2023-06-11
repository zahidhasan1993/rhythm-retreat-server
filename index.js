const express = require("express");
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;



//middleware
app.use(cors());
app.use(express.json())


//mongoDb connections

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.uoombu0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //Db collections
    const database = client.db('rhythm-retreate');
    const userCollections = database.collection("users");



    //API connections
    

    //post Apis
    app.post("/users", async (req, res) => {
        const user = req.body;
        const query = { email: user.email };
  
        const exitingUser = await userCollections.findOne(query);
        // console.log(exitingUser);
        if (exitingUser) {
          return res.send("user all ready exists");
        }
  
        const result = await userCollections.insertOne(user);
        res.send(result);
      });
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




//server
app.get("/", (req, res) => {
  res.send("Welcome to Rhythm-retreat Server");
});

app.listen(port, () => {
  console.log("running on port", port);
});
