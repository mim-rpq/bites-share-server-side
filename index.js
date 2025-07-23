require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);
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



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization
  // console.log(authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.firebaseUser = decoded;
    next()
    // console.log(decoded);
  }

  catch (error) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  // console.log('token', token);


}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db('bitesShare').collection('foods')
    const foodRequestCollection = client.db('bitesShare').collection('foodRequest')

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


    // get my added food 
    app.get('/foods/myAddedFood/user', verifyToken, async (req, res) => {
      const query = { userEmail: req.firebaseUser.email };
      const result = await foodCollection.find(query).toArray();
      res.send(result)
    })

    // food request api -------------------------------------------------


    // get food request 
    app.get('/foodRequests', verifyToken, async (req, res) => {
      const query = { requesterEmail: req.firebaseUser.email };
      // console.log('query',query);
      const result = await foodRequestCollection.find(query).toArray();

      for (const request of result) {
        const foodId = request.foodId;
        const reqQuery = { _id: new ObjectId(foodId) }

        const food = await foodCollection.findOne(reqQuery)
        request.donorName = food.userName
        request.expiredDateTime = food.expiredDateTime
        request.pickupLocation = food.pickupLocation
        request.foodName = food.foodName

      }
      res.send(result)
    })

    const { ObjectId } = require('mongodb');


    // post food requests 

    app.post('/foodRequests', verifyToken, async (req, res) => {
      try {
        const request = req.body;
        request.requestDate = new Date();

        const requesterEmail = req.firebaseUser.email;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const requestCountToday = await foodRequestCollection.countDocuments({
          requesterEmail: requesterEmail,
          requestDate: {
            $gte: todayStart,
            $lte: todayEnd
          }
        });


        if (requestCountToday >= 3) {
          return res.status(403).json({
            message: 'You can only make 3 requests per day.'
          });
        }

        const result = await foodRequestCollection.insertOne(request);

        if (result.insertedId) {
          const foodId = request.foodId;
          await foodCollection.updateOne(
            { _id: new ObjectId(foodId) },
            { $set: { status: 'requested' } }
          );
        }

        res.send(result);

      } catch (error) {
        // console.error('Error in /foodRequests:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

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



    // delete my added food 
    app.delete('/foods/myAddedFood/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const existing = await foodCollection.findOne({ _id: new ObjectId(id) });


      if (!existing) {
        return res.status(404).send({ message: 'Food not found' });
      }

      if (existing.userEmail !== req.firebaseUser.email) {
        return res.status(403).send({ message: 'Forbidden: You cannot delete this food' });
      }
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    })



    // get available food 
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
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

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



