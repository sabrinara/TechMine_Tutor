const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient,ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
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
const db = client.db('techmine_tutor');
const usersCollection = db.collection('users');
const tutorsCollection = db.collection('tutors');

// Middleware for verifying token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware for verifying admin role
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
};

// Routes

// Register
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { name, email, password: hashedPassword, role: role || 'user' };
    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
});

// Get all tutors (No authentication required)
app.get('/tutors', async (req, res) => {
    const tutors = await tutorsCollection.find().toArray();
    res.status(200).json(tutors);
});

// Get single tutor (No authentication required)
app.get('/tutors/:id', async (req, res) => {
    const tutor = await tutorsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!tutor) {
        return res.status(404).json({ error: 'Tutor not found' });
    }
    res.status(200).json(tutor);
});

// Admin: Add tutor
app.post('/tutors', verifyToken, verifyAdmin, async (req, res) => {
    const { name, expertise, email } = req.body;
    if (!name || !expertise || !email) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await tutorsCollection.insertOne({ name, expertise, email });
    res.status(201).json({ message: 'Tutor added successfully', tutorId: result.insertedId });
});

// Admin: Update tutor
app.put('/tutors/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { name, expertise, email } = req.body;
    const updatedTutor = await tutorsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, expertise, email } }
    );
    if (!updatedTutor.modifiedCount) {
        return res.status(404).json({ error: 'Tutor not found' });
    }
    res.status(200).json({ message: 'Tutor updated successfully' });
});

// Admin: Delete tutor
app.delete('/tutors/:id', verifyToken, verifyAdmin, async (req, res) => {
    const result = await tutorsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) {
        return res.status(404).json({ error: 'Tutor not found' });
    }
    res.status(200).json({ message: 'Tutor deleted successfully' });
});

// Get all users (No authentication required)
app.get('/users', async (req, res) => {
    const users = await usersCollection.find().toArray();
    res.status(200).json(users);
});

// Get single user
app.get('/users/:id', verifyToken, async (req, res) => {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
});

// Update user (Only user can update their data)
app.put('/users/:id', verifyToken, async (req, res) => {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email } = req.body;
    const updatedUser = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, email } }
    );
    if (!updatedUser.modifiedCount) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully' });
});

// Admin: Delete user
app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
});

// Start the server
const port = process.env.PORT || 5000;
client.connect().then(() => {
    app.listen(port, () => {
        console.log(`TechMine Tutor Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});
