import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import express from "express";
import { Client } from "deno-postgres";
import cors from "cors";
const port = 3001;
const app = express();

app.use(express.json());
app.use(cors());

const options = {
  host: Deno.env.get("PGHOST"),
  port: Number(Deno.env.get("PGPORT")),
  database: Deno.env.get("PGDATABASE"),
  user: Deno.env.get("PGUSER"),
  password: Deno.env.get("PGPASSWORD"),
  pool_mode: "transaction",
};

const client = new Client(options);

try {
  await client.connect();
  console.log("Successfully connected to PostgreSQL");
} catch (err) {
  console.log(client);
  console.error("Error connecting to PostgreSQL:", err);
}

app.get("/daily-students", async (req, res) => {
  const participants = await client.queryObject(`SELECT
  question_slug,
  username,
  lang
FROM
  "Solutions" as S
  JOIN "Participants" as P ON P.id = S.participant_id
  JOIN "Questions" as Q ON S.question_id = Q.id
WHERE
  Q.date_to_solve = ${Deno.env.get("DEV")?`'2024-12-28'`:'CURRENT_DATE'}
  AND DATE (S.solved_at) = ${Deno.env.get("DEV")?`'2024-12-28'`:'CURRENT_DATE'}
`).then((result) => result.rows);
  res.status(200).json(participants);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
