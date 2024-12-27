// @deno-types="npm:@types/express@^4.17"
import express from 'express'
import cors from 'cors';
import { Client} from 'deno-postgres'

const app = express()
app.use(express.json())
// If you want a payload larger than 100kb, then you can tweak it here:
// app.use( express.json({ limit : "300kb" }));
//allow request from all origin
const corsOptions = {
  origin: '*', // or specify the allowed origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
const port = 3000
const options = {
  host: Deno.env.get("PGHOST"),
  port: Number(Deno.env.get("PGPORT")),
  database: Deno.env.get("PGDATABASE"),
  user: Deno.env.get("PGUSER"),
  password: Deno.env.get("PGPASSWORD"),
  pool_mode: 'transaction',
};
console.log(options)
const client = new Client(options);  

try {
  await client.connect();
  console.log('Successfully connected to PostgreSQL');
} catch (err) {
  console.error('Error connecting to PostgreSQL:', err);
  throw err;
}

app.get('/validate-and-update', (req, res) => {
  console.log("served")
  res.json({message:'Hello World!'})
})

app.post('/validate-and-update', (req, res) => {
  if(req.body.userData === undefined || req.body.problemUrl === undefined) {
    console.log('No body found')
    res.status(400).json({message:'error'})
  }
  else {
    const { userData, problemUrl } = req.body
    console.log('userData:', userData)
    console.log('problemUrl:', problemUrl)
    res.json({message:'Hello World!'})
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/validate-and-update' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
