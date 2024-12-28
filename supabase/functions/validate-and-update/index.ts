// @deno-types="npm:@types/express@^4.17"
import express from "express";
import cors from "cors";
import { Client } from "deno-postgres";

const app = express();
app.use(express.json());
// If you want a payload larger than 100kb, then you can tweak it here:
// app.use( express.json({ limit : "300kb" }));
const corsOptions = {
  origin: "*", // or specify the allowed origin
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
const port = 3001;
const orender_headers = {
  limit_skip_token: "aahftab",
};
const options = {
  host: Deno.env.get("PGHOST"),
  port: Number(Deno.env.get("PGPORT")),
  database: Deno.env.get("PGDATABASE"),
  user: Deno.env.get("PGUSER"),
  password: Deno.env.get("PGPASSWORD"),
  pool_mode: "transaction",
};
console.log(options);
const client = new Client(options);

try {
  await client.connect();
  console.log("Successfully connected to PostgreSQL");
} catch (err) {
  console.error("Error connecting to PostgreSQL:", err);
  throw err;
}

app.get("/validate-and-update", (req, res) => {
  console.log("served");
  res.json({ message: "Hello World!" });
});

app.post("/validate-and-update", async (req, res) => {
  if (req.body.userData === undefined || req.body.problemUrl === undefined) {
    console.log("No body found");
    console.log(req.body);
    res
      .status(400)
      .json({ message: "Either you are not signed in or wrong problem url" });
  } else {
    const { userData, problemUrl } = req.body;
    console.log("userData:", userData);
    console.log("problemUrl:", problemUrl);
    try {
      const username_api = `https://leetcode-api-q01j.onrender.com/${userData.username}`;
      await fetch(username_api, { headers: orender_headers })
        .then((response) => response.json())
        .then(async (data) => {
          if (data.username) {
            console.log("Username found");
            const recent_submission_api = `https://leetcode-api-q01j.onrender.com/${userData.username}/acSubmission`;
            await fetch(recent_submission_api, { headers: orender_headers })
              .then((response) => response.json())
              .then(async (data) => {
                console.log(data);
                if (data.count > 0) {
                  const findTargetSlug = (data, problemUrl) => {
                    for (const submission of data.submission) {
                      if (problemUrl.includes(submission.titleSlug)) {
                        return submission;
                      }
                    }
                    return null;
                  };

                  const result = findTargetSlug(data, problemUrl);
                  if (result) {
                    try {
                      await client.connect();
                      console.log("Successfully connected to PostgreSQL");
                      const userIdResult = await client.queryObject(
                        `SELECT id FROM "Participants" WHERE username = '${userData.username}'`
                      );
                      const questionIdResult = await client.queryObject(
                        `SELECT id FROM "Questions" WHERE question_slug = '${result.titleSlug}'`
                      );
                      console.log("userId:", userIdResult);
                      console.log("questionId:", questionIdResult);
                      if (
                        userIdResult.rowCount > 0 &&
                        questionIdResult.rowCount > 0
                      ) {
                        const checkIfAlreadySubmittedResult =
                          await client.queryObject(
                            `SELECT * FROM "Solutions" WHERE participant_id = ${userIdResult.rows[0].id} AND question_id = ${questionIdResult.rows[0].id}`
                          );
                        if (checkIfAlreadySubmittedResult.rowCount > 0) {
                          console.log("Already submitted");
                          return res
                            .status(409)
                            .json({ message: "Already submitted" });
                        } else {
                          const insertSolutionResult = await client.queryObject(
                            `INSERT INTO "Solutions" (participant_id, question_id, solved_at) VALUES (${userIdResult.rows[0].id}, ${questionIdResult.rows[0].id}, NOW()::timestamp(0))`
                          );
                          console.log(
                            "Inserted solution:",
                            insertSolutionResult.rows
                          );
                          return res
                            .status(200)
                            .json({ message: "Successfully submitted" });
                        }
                      }
                    } catch (err) {
                      console.error("Error connecting to PostgreSQL:", err);
                      return res
                        .status(400)
                        .json({ message: "Couldn't connect to database" });
                    }
                    console.log("Target slug found:", result);
                    return res
                      .status(200)
                      .json({ message: "Target slug found" });
                  } else {
                    console.log("Target slug not found");
                    return res
                      .status(404)
                      .json({ message: "Target slug not found" });
                  }
                }
              });
          } else {
            console.log("Username not found");
            return res.status(404).json({ message: "Username not found" });
          }
        });
      return res.json({ message: "Hello World!" });
    } catch (err) {
      console.error("Error:", err);
      return res.status(400).json({ message: "Error at server" });
    }
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
