// server.js
// where your node app starts

// init project
require("dotenv").config();
const {
  VOTE_WEBHOOK_ID,
  VOTE_WEBHOOK_TOKEN,
  CLIENT_ID,
  BOT_TOKEN,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPES
} = process.env;
const express = require("express");
const { Client, WebhookClient } = require("discord.js");
const Keyv = require("keyv");
require('fs').writeFileSync('pidfile',process.pid.toString())
const votes = new Keyv("sqlite://.data/database.sqlite", {
  namespace: "votes"
});
const stats = new Keyv("sqlite://.data/database.sqlite", {
  namespace: "stats"
});
const client = new Client();
const fetch = require("node-fetch");
const vote_hook = new WebhookClient(VOTE_WEBHOOK_ID, VOTE_WEBHOOK_TOKEN);
const https = require('https')
const crypto = require("crypto");
const fs = require('fs')
const FormData = require("form-data");
const app = express();
const tmp = require('os').tmpdir()
if (!fs.readdirSync(tmp).includes('no-fortnite')) {
  fs.mkdirSync(`${tmp}/no-fortnite`)
}
app.disable("x-powered-by");
// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.
require("./index.js");
// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public", { extensions: ['html', 'css', 'js', 'json', 'txt'] }));
app.use(express.json());
//http://expressjs.com/en/starter/basic-routing.html
app.use('/', (req, res, next) => {
  res.set("Server", "Apache/2.2.15 (RedStar4.0)")
  res.set('Access-control-allow-origin', '*')
  next()
})
app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8')
  next()
})
app.get('/error', (req, res) => { throw new Error("test-error") })
app.get("/api", (_, response) => { response.send('"hi"') });
app.get("/api/v1", (_, response) => {
  response.send('{"version":"1.0"}');
});
app.post("/api/v1/upvote", async (request, response) => {
  const key = request.headers.authorization;
  if (!key) return response.status(401).send('"Please provide the vote key."');
  const hash = crypto
    .createHash("md5")
    .update(key)
    .digest("hex");
  if (hash !== process.env.DBL_KEY_HASH)
    return response.status(401).send('"Incorrect key"');
    const user = await client.users.fetch(request.body.user);
    vote_hook.send(`${user.tag} (${user.id}) has just voted!`);
    console.log(`${user.tag} (${user.id}) has just voted!`)
});
app.get("/api/v1/bans", async (request, response) => {
  const count = (await stats.get("global-ban-count")) || 0;
  response.send(count.toString());
});
app.get("/api/v1/join/callback", async (request, response) => {
  response.set('Content-Type', 'text/html')
  const data = new FormData();
  data.append("client_id", CLIENT_ID);
  data.append("client_secret", CLIENT_SECRET);
  data.append("grant_type", "authorization_code");
  data.append("redirect_uri", REDIRECT_URI);
  data.append("scope", SCOPES);
  data.append("code", request.query.code);
  const credintals = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: data
  }).then(res => res.json());
  const user = await fetch("https://discord.com/api/users/@me", {
    method: "GET",
    headers: {
      authorization: `${credintals.token_type} ${credintals.access_token}`
    }
  }).then(res => res.json());
  fetch(
    "https://discord.com/api/v7/guilds/651703685595791380/members/" +
    user.id,
    {
      method: "PUT",
      headers: {
        authorization: "Bot " + BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: `${credintals.access_token}`
      })
    }
  ).then(res => {
    return res.ok ? response.sendFile(__dirname + '/views/redirect.html') : response.send('"failed"');
  });
});
app.use('/api', (req, res) => {
  if (req.method === 'get') return res.status(405).send('"Method not allowed"')
  else return res.status(404).send('"Not Found"')
})
app.use((err, req, res, next) => {
  if (err.message !== "test-error") console.error(err)
  res.status(500).sendFile(__dirname + '/views/500.html')
})
app.use((req, res) => { res.status(404).sendFile(__dirname + '/views/404.html') })
setInterval(() => {
  fetch(`https://${process.env.PROJECT_DOMAIN}.glitch.me`)
}, 60000)
https.createServer({
  key:fs.readFileSync('.ssl/private.pem','utf8'),
  cert:fs.readFileSync('.ssl/certificate.crt','utf8')
},app).listen(3000)
client.login(process.env.RANDOM_BOT_TOKEN);
