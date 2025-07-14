require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
// middleware

app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ojps7gr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const foodCollection = client.db('bitesShare').collection('foods')

    // get featured food by query 
    app.get('/foods/featuredFoods', async (req, res) => {
      const query = { status: "available" };
      const options = {
        sort: { foodQuantity: -1 },
        limit: 6
      };

      const cursor = foodCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get available all food 
    app.get('/foods/availableFoods', async (req, res) => {
      const sortOrder = req.query.sort === 'asc' ? 1 : -1;

      const query = { status: 'available' };

      const options = {
        sort: { expiredDateTime: sortOrder }
      };

      const result = await foodCollection.find(query, options).toArray();
      res.send(result);
    });


    app.get('/foods/myAddedFood/user', async (req, res) => {
      const userEmail = req.query.email;

      console.log('req header', req.headers);
      const query = { userEmail };

      const result = await foodCollection.find(query).toArray();
      // console.log(result, 'result is');
      res.send(result)



    })

    app.put('/foods/myAddedFood/:id', async(req, res)=>{
            const id = req.params.id;
            const filter ={_id: new ObjectId(id)}
            const options ={ upsert : true};
            const updatedFood = req.body
            const updatedDoc ={
                $set: updatedFood
            }

            const result = await foodCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })


    app.delete('/foods/myAddedFood/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    })

      


      app.get('/foods/availableFoods/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodCollection.findOne(query);
        res.send(result)
      })




      // post foods
      app.post('/foods', async (req, res) => {
        const newFood = req.body;
        const result = await foodCollection.insertOne(newFood)
        res.send(result)
      })

























      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
run().catch(console.dir);
















  app.get('/', (req, res) => {
    res.send('Bites share')
  })

  app.listen(port, () => {
    console.log(`Bites share server is running on port ${port}`);
  })



