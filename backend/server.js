const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.json());


// -----------------------------
// SERVING STATIC FILES
// -----------------------------
app.use(express.static(path.join(__dirname, "../frontend")));


// -----------------------------
// FILE PATHS
// -----------------------------
const usersFile = path.join(__dirname, "data/users.json");
const logFile = path.join(__dirname, "data/server.log");


// -----------------------------
// FILE MODULE FUNCTIONS
// -----------------------------

// READ FILE
function getUsers() {

    const data = fs.readFileSync(usersFile);

    return JSON.parse(data);

}


// WRITE FILE
function saveUsers(users) {

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

}


// APPEND FILE (log system)
function logEvent(message) {

    fs.appendFileSync(logFile, message + "\n");

}


// DELETE FILE
app.delete("/api/delete-log", (req, res) => {

    if (fs.existsSync(logFile)) {

        fs.unlinkSync(logFile);

        res.json({ message: "Log file deleted" });

    } else {

        res.json({ message: "Log file not found" });

    }

});


// -----------------------------
// LOGIN API
// -----------------------------
app.post("/api/login", (req, res) => {

    const { username, password } = req.body;

    const users = getUsers();

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (user) {

        logEvent("User logged in: " + username);

        res.json({
            id: user.id,
            username: user.username,
            unlockedLevel: user.unlockedLevel
        });

    } else {

        res.json({ error: "Invalid username or password" });

    }

});



// -----------------------------
// LOAD PROGRESS
// -----------------------------
app.get("/api/load-progress/:id", (req, res) => {

    const userId = parseInt(req.params.id);

    const users = getUsers();

    const user = users.find(u => u.id === userId);

    if (user) {

        res.json({
            unlockedLevel: user.unlockedLevel
        });

    } else {

        res.json({ error: "User not found" });

    }

});



// -----------------------------
// SAVE PROGRESS
// -----------------------------
app.post("/api/save-progress", (req, res) => {

    const { playerId, unlockedLevel } = req.body;

    let users = getUsers();

    const userIndex = users.findIndex(u => u.id === playerId);

    if (userIndex !== -1) {

        users[userIndex].unlockedLevel = unlockedLevel;

        saveUsers(users);

        logEvent("Progress updated for user: " + playerId);

        res.json({ message: "Progress saved successfully" });

    } else {

        res.json({ error: "User not found" });

    }

});



// -----------------------------
// FILE STREAM EXAMPLE
// -----------------------------
app.get("/api/stream-users", (req, res) => {

    const stream = fs.createReadStream(usersFile);

    res.setHeader("Content-Type", "application/json");

    stream.pipe(res);

});



// -----------------------------
// TEST ROUTE
// -----------------------------
app.get("/api/test", (req, res) => {

    res.json({
        message: "Server is running"
    });

});



// -----------------------------
// START SERVER
// -----------------------------
app.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);

});