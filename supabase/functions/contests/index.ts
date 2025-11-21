import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import express from "express";
import { Client } from "deno-postgres";
import cors from "cors";
const port = 3001;
const app = express();

app.use(express.json());
//allow localhost cors
app.use(cors());

const client = new Client(Deno.env.get("SUPABASE_DB_URL"));

try {
  await client.connect();
  console.log("Successfully connected to PostgreSQL");
} catch (err) {
  console.log(client);
  console.error("Error connecting to PostgreSQL:", err);
}

app.get("/contests", async (req, res) => {
  const contests = await client.queryObject(`
    SELECT * FROM "contests" order by id desc`)
    .then((result) => result.rows.map(row => {
      const newRow = {};
      for (const key in row) {
        if (typeof row[key] === 'bigint') {
          newRow[key] = row[key].toString();
        } else {
          newRow[key] = row[key];
        }
      }
      return {id: newRow.id, name: newRow.contest_name, contestDate: newRow.contest_date, startTime: newRow.start_time, endTime: newRow.end_time};
    }));
  console.log(contests);
  res.status(200).json(contests);
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});