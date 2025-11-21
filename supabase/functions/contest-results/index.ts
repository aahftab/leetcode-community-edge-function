import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import express from "express";
import { Client } from "deno-postgres";
import cors from "cors";
const port = 3001;
const app = express();

app.use(express.json());
app.use(cors());

const client = new Client(Deno.env.get("SUPABASE_DB_URL"));

try {
  await client.connect();
  console.log("Successfully connected to PostgreSQL");
} catch (err) {
  console.log(client);
  console.error("Error connecting to PostgreSQL:", err);
}

app.get("/contest-results/:id", async (req, res) => {
  const contestId = req.params.id;
  const contestResults = await client
    .queryObject(
      `WITH RankedContestants AS (
    SELECT
        "Participants".name,
        "contests".contest_name,
        COUNT("Solutions".id) AS questions_solved,
        AVG(EXTRACT(EPOCH FROM ("Solutions".solved_at - "contests".start_time))) AS average_time_seconds,  -- Average time in seconds
        RANK() OVER (ORDER BY COUNT("Solutions".id) DESC, AVG(EXTRACT(EPOCH FROM ("Solutions".solved_at - "contests".start_time))) ASC) AS rank
    FROM
        "contest_participants"
    JOIN 
        "contests" ON "contest_participants".contest_id = "contests".id
    JOIN 
        "Participants" ON "contest_participants".participant_id = "Participants".id
    JOIN 
        "contest_questions" ON "contest_questions".contest_id = "contests".id
    JOIN 
        "Questions" ON "Questions".id = "contest_questions".question_id
    JOIN 
        "Solutions" ON "Solutions".question_id = "Questions".id
    WHERE 
        "Solutions".solved_at::time > "contests".start_time
        AND "Solutions".solved_at::time < "contests".end_time
        AND "contests".id = $1
    GROUP BY 
        "Participants".name, "contests".contest_name
)
SELECT 
    rank,
    name,
    contest_name,
    questions_solved,
    TO_CHAR(TO_TIMESTAMP(average_time_seconds), 'HH24:MI:SS') AS average_time  -- Convert average seconds to HH:MM:SS
FROM 
    RankedContestants
ORDER BY 
    rank;
`,
      [contestId]
    )
    .then((result) =>
      result.rows.map((row) => {
        const newRow = {};
        for (const key in row) {
          if (typeof row[key] === "bigint") {
            newRow[key] = row[key].toString();
          } else {
            newRow[key] = row[key];
          }
        }
        return {
          rank: newRow.rank,
          name: newRow.name,
          contestName: newRow.contest_name,
          questionsSolved: newRow.questions_solved,
          averageTimePerQuestion: newRow.average_time,
        };
      })
    );
  res.status(200).json(contestResults);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
