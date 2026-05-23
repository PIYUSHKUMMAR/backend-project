const mongoose = require("mongoose");

// ----------------------------
// USER SCHEMA
// ----------------------------
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    unlockedLevel: {
        type: Number,
        default: 1
    }
});

// ----------------------------
// EXPORT MODEL
// ----------------------------
module.exports = mongoose.model("User", userSchema);