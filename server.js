

const express = require('express')
const app = express()
const configuration = require('./configuration.js');
const Dalai = require("dalai");
const dalai = new Dalai("./")
const morgan = require("morgan");
const helmet = require("helmet");
const path = require('path');
const fs = require('fs')
const cron = require('node-cron');

const compression = require("express-compression");
app.use(compression({filter: shouldCompress}));
function shouldCompress(req, res) {
  if (req.headers["x-no-compression"]) {
    return false;
  }
  return compression.filter(req, res);
}

process.on("uncaughtException", function(err) {
  console.error("SERVER Exception: ", err);
});


app.all("*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", process.env.AccessControlAllowOrigin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, traceparent, authorization, request-context, request-id");
  if ("OPTIONS" == req.method) {
  res.sendStatus(200);
  } else {
    next();
  }
});
app.use(morgan("dev"));
app.use(express.json());
app.use(helmet());
app.disable("x-powered-by");


configuration(app).then(async () => {
  const modelsPath = path.resolve(`./${app.locals.configuration.model_type}/models/${app.locals.configuration.model}`);
  if (fs.existsSync(modelsPath)) {
    console.debug("models is installed", modelsPath);
  } else {
    console.debug(" models not installed", modelsPath);
    await dalai.install(app.locals.configuration.model_type, app.locals.configuration.model);
  }
  
  app.listen(app.locals.configuration.port, async () => {
    console.debug(`[NODE] SERVER STARTING (${process.version})`);
    console.log(`Example app listening on port ${app.locals.configuration.port}`)
    await dalai.installed();
  });

});


app.get('/api/feed/', async (req, res) => {
  const result = await getAIExtendedRSSFeed();
  res.statusCode = 200;
  res.send(result);
});

cron.schedule('*/5 * * * *', () => {
  try {
    console.log('running a task 5 minutes');
  } catch (ex) {
    console.debug("ex ", ex);
  }
});

async function getAIExtendedRSSFeed() {
  let Parser = require('rss-parser');
  let parser = new Parser();
  let result = [];
  let feed = await parser.parseURL('https://www.wired.com/feed/tag/ai/latest/rss');
  let tokens = "";
  try {
    console.log(feed.title);
    for (const item of feed.items) {
      console.log(item.title + ':' + item.link) 
      tokens = "";
      await dalai.request({
        model: `${app.locals.configuration.model_type}.${app.locals.configuration.model}`,
        prompt: item.content + ":",
        skip_end: true,
        n_predict: 2000 - (
          item.content.length +
          item.title.length 
        )
      }, (token) => {
        process.stdout.write(".");
        tokens += token;
      });
      tokens = tokens.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
      result.push({
          title: item.title,
          link: item.link,
          content: item.content ,
          ai: tokens
      });
      console.debug("finished ai query: ", item.title);
      console.debug("finished ai result: ", tokens);
      
    }
  } catch(ex) {
    console.debug("ex ", ex);
  }
  return (result);
}

