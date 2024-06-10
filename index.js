const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4wc44xb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    // await client.connect();

    const userCollection = client.db("PawMateDb").collection("users")
    const petCollection = client.db("PawMateDb").collection("pet");
    const donationCollection = client.db("PawMateDb").collection("donationCamp");
    const adoptionCollection = client.db("PawMateDb").collection("adoptionRequest");
    const donatesCollection = client.db("PawMateDb").collection("donates");


    // PAYMENT
    app.post('/create-payment-intent', async (req, res) => {
      const { donate } = req.body;
      const amount = parseInt(donate * 100);
      console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    //get payment 
    app.post('/donates', async (req, res) => {
      const donates = req.body;
      const result = await donatesCollection.insertOne(donates)
      res.send(result)
    })

    //jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
      res.send({ token });
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    //verify admin 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    //User api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      //insert email if user does not exist
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })


    //get data for pets
    app.get('/pets', async (req, res) => {
      const result = await petCollection.find().toArray()
      res.send(result)
    })

    //getting details of single pet
    app.get('/pet/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.findOne(query)
      res.send(result)
    })

    //getting data posted by a user
    app.get('/pets/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await petCollection.find(query).toArray()
      res.send(result)
    })

    //delete a pet
    app.delete('/pet/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.deleteOne(query)
      res.send(result)
    })

    //update a pet data
    app.patch('/pet/:id', async (req, res) => {
      const id = req.params.id;
      const petData = req.body;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          ...petData
        }
      }
      const result = await petCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    //mark a pet as adopted
    app.put('/pet/adopted/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adopted: true
        }
      };
      const result = await petCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    //post a pet data
    app.post('/pet', async (req, res) => {
      const pet = req.body;
      const result = await petCollection.insertOne(pet)
      res.send(result);
    })

    //post a adopt request
    app.post('/adoption', async (req, res) => {
      const adoption = req.body;
      const result = await adoptionCollection.insertOne(adoption)
      res.send(result);
    })

    //getting categories of pet
    // app.get('/pets/:category', async (req, res) => {
    //   const category = req.params.category
    //   const cursor = petCollection.find({ pet_category: category })
    //   const result = await cursor.toArray()
    //   res.send(result)
    // })

    //get data for donation camp
    app.get('/donation-camps', async (req, res) => {
      const result = await donationCollection.find().toArray()
      res.send(result)
    })

    //getting details of single donation
    app.get('/donation-camp/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await donationCollection.findOne(query)
      res.send(result)
    })

    //post a donation camp data
    app.post('/donation-camp', async (req, res) => {
      const donation = req.body;
      const result = await donationCollection.insertOne(donation)
      res.send(result)
    })

    //get donation by email
    app.get('/donation-camps/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await donationCollection.find(query).toArray()
      res.send(result)
    })

    //get donators by postId
    app.get('/donation-camps/donators/:postId', async(req,res)=>{
      const postId = req.params.postId;
      const query ={postId: postId};
      const result = await donatesCollection.find(query).toArray()
      res.send(result);
    })


    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('PawMate is running')
})

app.listen(port, () => {
  console.log(`PawMate is running on port ${port}`)
})