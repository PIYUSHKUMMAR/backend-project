require("dotenv").config({
    path: "../.env"
});
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } =
require("multer-storage-cloudinary");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "myjwtsecret";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
});
// ----------------------------
// CLOUDINARY CONFIG
// ----------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage =
new CloudinaryStorage({

    cloudinary: cloudinary,

    params: {
        folder: "leveldevil",
        allowed_formats: [
            "jpg",
            "jpeg",
            "png"
        ]
    }

});

const upload = multer({
    storage
});
// ----------------------------
// MONGODB CONNECTION
// ----------------------------
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ----------------------------
// USER MODEL
// ----------------------------
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    unlockedLevel: {
        type: Number,
        default: 1
    }
});

const User = mongoose.model("User", userSchema);

// ----------------------------
// APP SETUP
// ----------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// ----------------------------
// TEMPLATE ENGINE
// ----------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ----------------------------
// MIDDLEWARE
// ----------------------------
app.use(morgan("dev"));

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------
// SESSION
// ----------------------------
app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true
    }
}));

// ----------------------------
// STATIC FILES
// ----------------------------
app.use("/game", express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static("uploads"));

// ----------------------------
// SOCKET.IO
// ----------------------------
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("levelComplete", (data) => {
        io.emit("levelUpdate", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

});

// ----------------------------
// ROUTER
// ----------------------------
const router = express.Router();

// ----------------------------
// SIGNUP
// ----------------------------
router.post("/signup", async (req, res) => {

    try {

        const { username, password } = req.body;

        const existing = await User.findOne({ username });

        if (existing) {
            return res.json({
                error: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            unlockedLevel: 1
        });

        await newUser.save();

        res.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        res.json({
            error: "Signup failed"
        });

    }

});

// ----------------------------
// LOGIN
// ----------------------------
router.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.json({
                error: "Invalid credentials"
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.json({
                error: "Invalid credentials"
            });
        }

        // SESSION
        req.session.user = {
            id: user._id,
            username: user.username,
            unlockedLevel: user.unlockedLevel
        };

        // JWT TOKEN
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            success: true,
            token,
            _id: user._id,
            username: user.username,
            unlockedLevel: user.unlockedLevel
        });

    } catch (err) {

        console.log(err);

        res.json({
            error: "Login failed"
        });

    }

});

// ----------------------------
// SAVE PROGRESS
// ----------------------------
router.post("/save-progress", async (req, res) => {

    try {

        const { playerId, unlockedLevel } = req.body;

        await User.findByIdAndUpdate(playerId, {
            unlockedLevel
        });

        io.emit("levelUpdate", {
            playerId,
            unlockedLevel
        });

        res.json({
            message: "Progress saved"
        });

    } catch (err) {

        console.log(err);

        res.json({
            error: "Failed to save progress"
        });

    }

});

// ----------------------------
// USE ROUTER
// ----------------------------
app.use("/api", router);

// ----------------------------
// JWT MIDDLEWARE
// ----------------------------
function authenticateJWT(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token =
        authHeader &&
        authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "No token"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {

        if (err) {
            return res.status(403).json({
                error: "Invalid token"
            });
        }

        req.user = user;

        next();

    });

}

// ----------------------------
// PROTECTED ROUTE
// ----------------------------
app.get("/api/profile", authenticateJWT, (req, res) => {

    res.json({
        message: "Protected route",
        user: req.user
    });

});

// ----------------------------
// PRISMA CRUD ROUTES
// ----------------------------

// CREATE SCORE
app.post("/api/leaderboard", async (req, res) => {

    try {

        const { username, score } = req.body;

        const newScore = await prisma.leaderboard.create({
            data: {
                username,
                score
            }
        });

        res.json(newScore);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed to save score"
        });

    }

});

// READ SCORES
app.get("/api/leaderboard", async (req, res) => {

    try {

        const scores = await prisma.leaderboard.findMany({
            orderBy: {
                score: "desc"
            }
        });

        res.json(scores);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed to fetch leaderboard"
        });

    }

});

// UPDATE SCORE
app.put("/api/leaderboard/:id", async (req, res) => {

    try {

        const id = parseInt(req.params.id);

        const { score } = req.body;

        const updated = await prisma.leaderboard.update({
            where: {
                id
            },
            data: {
                score
            }
        });

        res.json(updated);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed to update score"
        });

    }

});

// DELETE SCORE
app.delete("/api/leaderboard/:id", async (req, res) => {

    try {

        const id = parseInt(req.params.id);

        await prisma.leaderboard.delete({
            where: {
                id
            }
        });

        res.json({
            message: "Score deleted"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed to delete score"
        });

    }

});
// ----------------------------
// FILE UPLOAD (MULTER)
// ----------------------------
app.post(
    "/api/upload",
    upload.single("image"),
    (req, res) => {

        res.json({
    message: "File uploaded successfully",
    imageUrl: req.file.path
});

    }
);

// ----------------------------
// SSR ROUTES
// ----------------------------
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/dashboard", (req, res) => {

    if (!req.session.user) {
        return res.send("Please login first");
    }

    res.render("dashboard", req.session.user);

});

// ----------------------------
// LOGOUT
// ----------------------------
app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/");
    });

});

// ----------------------------
// ERROR HANDLER
// ----------------------------
app.use((err, req, res, next) => {

    console.error(err.message);

    res.status(500).json({
        error: "Something went wrong"
    });

});

// ----------------------------
// START SERVER
// ----------------------------
if (require.main === module) {

    server.listen(PORT, () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    });

}

module.exports = app;