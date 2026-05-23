const request = require("supertest");
const app = require("../server");

describe("Login API", () => {

    test("Should reject invalid login", async () => {

        const res = await request(app)
            .post("/api/login")
            .send({
                username: "wrong",
                password: "wrong"
            });

        expect(res.body.error)
            .toBe("Invalid credentials");

    });

});