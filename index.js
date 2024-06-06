const express = require('express');
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
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

    const petCollection = client.db("PawMateDb").collection("pet");
    const donationCollection = client.db("PawMateDb").collection("donationCamp")


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
    app.get('/pets/:email', async(req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const result = await petCollection.find(query).toArray()
      res.send(result)
    })

    //delete a pet
    app.delete('/pet/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result= await petCollection.deleteOne(query)
      res.send(result)
    })

    //update a pet data
    app.patch('/pet/:id', async(req,res)=>{
      const id = req.params.id;
      const petData = req.body;
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          ...petData
        }
      }
      const result = await petCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    //mark a pet as adopted
    app.put('/pet/adopted/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          adopted: true
        }
      };
      const result = await petCollection.updateOne(query,updateDoc);
      res.send(result)
    })

    //post a pet data
    app.post('/pet', async(req,res)=>{
      const pet = req.body;
      const result = await petCollection.insertOne(pet)
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