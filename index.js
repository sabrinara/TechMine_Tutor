const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());


const uri = process.env.DB_URL;

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
        const usersCollection = client.db('techmine_tutor').collection('users');
        const tutorsCollection = client.db('techmine_tutor').collection('tutors');

        // await client.connect();
        // get all users
        app.get('/users', async (req, res) => {
            try {
                const users = await usersCollection.find().toArray();
                res.json(users);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });



        // get user by email
        app.get("/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const user = await usersCollection.findOne(query);

                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.json(user);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });


        // role update
        app.patch("/users/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body;

                // Validate the role to prevent unauthorized role changes (optional)
                const validRoles = ["user", "admin"];
                if (!validRoles.includes(role)) {
                    return res.status(400).json({ error: "Invalid role" });
                }

                const updatedUser = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { role } },
                    { returnOriginal: false } // Return the updated document
                );

                if (!updatedUser.value) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.json(updatedUser.value);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });
        
        //get user by id
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.findOne(query);
            res.send(result);
        });



        // post user
        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                // Validate user data here (e.g., required fields)

                const query = { email: user.email };
                const existingUser = await usersCollection.findOne(query);

                if (existingUser) {
                    return res.status(409).json({ message: 'User already exists', insertedId: null });
                }

                const result = await usersCollection.insertOne(user);
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

        
        // update user profile by name and image 
        app.patch("/users/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const { name, image } = req.body;

                if (!ObjectId.isValid(email)) {
                    return res.status(400).json({ error: "Invalid user ID" });
                }

                const updatedUser = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(email) },
                    { $set: { name, image } },
                    { returnOriginal: false }
                );

                if (!updatedUser.value) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.json(updatedUser.value);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        })
        //delete user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });



        // tutors updates status
        app.patch("/tutors/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: "Invalid tutor ID" });
                }

                const updatedTutors = await tutorsCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { status } },
                    { returnOriginal: false }
                );

                if (!updatedTutors.value) {
                    return res.status(404).json({ error: "Tutor not found" });
                }

                res.json(updatedTutors.value);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });


        //get all tutors
        app.get('/tutors', async (req, res) => {
            const cursor = tutorsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // Get single tutors
        app.get('/tutors/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tutorsCollection.findOne(query);
            res.send(result);
        });

        // Post tutors
        app.post('/tutors', async (req, res) => {
            const tutors = req.body;
            console.log("hit the post api", tutors);
            const result = await tutorsCollection.insertOne(tutors);
            res.send(result);
        });


        // Delete a tutors
        app.delete('/tutors/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tutorsCollection.deleteOne(query);
            res.send(result);
        });

        // Update a tutors
        app.put("/tutors/:id", async (req, res) => {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ error: "Invalid tutor ID" });
            }

            const updatedTutors = req.body;

            const result = await tutorsCollection.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updatedTutors },
                { returnOriginal: false }
            );

            if (!result.value) {
                return res.status(404).json({ error: "Tutor not found" });
            }

            res.json(result.value);
        });


        // Update view count
        app.put('/tutors/view/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const update = { $inc: { views: 1 } };
            const options = { returnOriginal: false };
            const result = await tutorsCollection.findOneAndUpdate(query, update, options);
            res.send(result.value);
        });

        // Approve or Decline an article
        app.patch('/tutors/approve/:id', async (req, res) => {
            const id = req.params.id;
            const { status, declineReason } = req.body;

            const query = { _id: new ObjectId(id) };
            const update = status === 'approved'
                ? { $set: { status: 'approved' } }
                : { $set: { status: 'declined', declineReason } };

            const options = { returnOriginal: false };
            const result = await tutorsCollection.findOneAndUpdate(query, update, options);

            res.send(result.value);
        });

        // Make an tutor premium
        app.patch('/tutors/premium/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const update = { $set: { isPremium: true } };

            const options = { returnOriginal: false };
            const result = await tutorsCollection.findOneAndUpdate(query, update, options);

            res.send(result.value);
        });


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
    res.send('TechMine Tutor is running!')
})

app.listen(port, () => {
    console.log(`TechMine Tutor is running on port: ${port}`)
})
