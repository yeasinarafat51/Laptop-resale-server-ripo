const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-4op8dy6-shard-00-00.v58lgaw.mongodb.net:27017,ac-4op8dy6-shard-00-01.v58lgaw.mongodb.net:27017,ac-4op8dy6-shard-00-02.v58lgaw.mongodb.net:27017/?ssl=true&replicaSet=atlas-z2p65m-shard-0&authSource=admin&retryWrites=true&w=majority`;
console.log(uri)
// const uri = "mongodb+srv://<username>:<password>@cluster0.v58lgaw.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run(){
    try{
        const leptopcollection = client.db('leptop').collection('seller');
        const bookingcollection = client.db('leptop').collection('booking');
        const userscollection = client.db('leptop').collection('users');
        const ordercollection = client.db('leptop').collection('order');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userscollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userscollection.findOne(query);

            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/seller', async(req, res) =>{
            const query = {};
            const options = await leptopcollection.find(query).toArray();
            res.send(options);
        })
       
        
        app.get('/seller/:id', async(req, res) =>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const seller = await leptopcollection.findOne(query);
            res.send(seller);
        })
        // verifyJWT,

        app.get('/bookings',verifyJWT,  async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingcollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/booking', async(req, res) =>{
            const booking = req.body
            const query = {
                date: booking.date,
                email: booking.email,
                
            }

            const alreadyBooked = await bookingcollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.date}`
                return res.send({ acknowledged: false, message })
            }


            const result = await bookingcollection.insertOne(booking)
            res.send(result);
        })
        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userscollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '72h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {
            
            const query = {role:null};
            const users = await userscollection.find(query).toArray();
            res.send(users);
        });
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userscollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userscollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userscollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })
        app.get('/sellerses', async (req, res) => {
            // const email = req.params.email;
            const query = {role: 'seller'} 
            const user = await userscollection.find(query).toArray();
            res.send(user);
        })
        // delete sellerrrooo git commit -m "six"vvvvoooooppppppiiii
        app.delete('/users/seller/:id',  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userscollection.deleteOne(filter);
            res.send(result);
        })
        

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userscollection.insertOne(user);
            res.send(result);
        });
         // verifyJWT, verifyAdmin,

         app.put('/users/admin/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userscollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        // verifyJWT, verifyAdmin,

        app.get('/order', async (req, res) => {
            const query = {};
            const order = await ordercollection.find(query).toArray();
            res.send(order);
        })


        // verifyJWT, verifyAdmin,
        app.post('/order',  async (req, res) => {
            const order = req.body;
            const result = await ordercollection.insertOne(order);
            res.send(result);
        });
        // verifyJWT, verifyAdmin,
        app.delete('/order/:id',  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await ordercollection.deleteOne(filter);
            res.send(result);
        })
        

    }
    finally{

    }

}
run().catch()





app.get('/', async(req, res) =>{
    res.send('leptop server is running');

})

app.listen(port, () => console.log(`leptop is running ${port}`))