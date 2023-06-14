const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  //   console.log("jwt function autho : ",authorization);
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorize user" });
  }
  const token = authorization.split(" ")[1];
  // console.log("token from jwt function :", token);
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized user" });
    }
    req.decoded = decoded;
    next();
  });
};

//mongoDb connections

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.uoombu0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //Db collections
    const database = client.db("rhythm-retreate");
    const userCollections = database.collection("users");
    const classCollections = database.collection("classes");
    const cartCollections = database.collection("cart");
    const paymentCollection = database.collection('payments')

    // jwt token
    app.post("/jwt", (req, res) => {
      const body = req.body;
      const token = jwt.sign(body, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //API connections
    //get Apis
    app.get("/users", async (req, res) => {
      const result = await userCollections.find().toArray();
      console.log();
      res.send(result);
    });
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      const result = { admin: user?.role === "admin" };

      res.send(result);
    });
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      // console.log('instructor',result);
      res.send(result);
    });
    app.get("/classes", async (req, res) => {
      const result = await classCollections.find().toArray();
      // console.log(result);
      res.send(result);
    });
    app.get('/classes/:id', async (req,res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await classCollections.findOne(query);

      res.send(result)
    })
    app.get("/cart/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const result = await cartCollections.find(query).toArray();

      res.send(result);
    });

    //post Apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };

      const exitingUser = await userCollections.findOne(query);
      // console.log(exitingUser);
      if (exitingUser) {
        return res.send("user all ready exists");
      }

      const result = await userCollections.insertOne(user);
      res.send(result);
    });
    app.post("/classes/addclass", verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await classCollections.insertOne(body);

      res.send(result);
    });
    app.post("/cart", verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await cartCollections.insertOne(body);
      res.send(result);
    });

    //payment gateway
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      // console.log(paymentIntent.client_secret);
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.post('/payment/:email', verifyJWT, async (req,res) => {
      const payment = req.body;
      const email = req.params.email;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = { email: {$regex: email}}
      const cartResult = await cartCollections.deleteMany(query)
      res.send({paymentResult, cartResult});
    })
    //PATCH Apis
    app.patch("/users/admin/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(id);
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.patch("/users/instructor/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(id);
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.patch("/classes/approve/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollections.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.patch("/classes/deny/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollections.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.patch("/classes/feedback/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const feedback = req.body;
      console.log(feedback);
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollections.updateOne(filter, updateDoc);

      res.send(result);
    });
    //delete API
    app.delete("/cart/delete/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await cartCollections.deleteOne(query);
      res.send(result)
    });

    //db connection check

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
