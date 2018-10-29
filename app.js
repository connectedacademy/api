require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const mongoose = require('mongoose')

const port = process.env.PORT || 3000
const passport = require('passport')
const flash = require('connect-flash')
const serveStatic = require('serve-static')
const fileUpload = require('express-fileupload')

const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const Sentry = require('@sentry/node')

const configDB = require('./config/database.js')

const app = express()

var appRoot = require('app-root-path')
var winston = require('winston')
var expressWinston = require('express-winston')

var http = require('http').Server(app)
var io = require('socket.io')(http)

io.on('connection', function(socket) {
  console.log('a user connected')
  socket.on('disconnect', function () {
    console.log('user disconnected')
  })
  socket.join(['class'], () => {
    let rooms = Object.keys(socket.rooms)
    console.log(rooms)
  })
})

require('./config/passport')(passport) // pass passport for configuration

app.use(cors({
  credentials: true,
  origin: ['http://localhost:8080', 'http://ca.local:8080', 'https://connectedacademy.io', 'https://connectedacademy.org', /\.connectedacademy\.io$/, /\.connectedacademy\.org$/],
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  headers: ['X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version']
}))

mongoose.connect(configDB.url) // connect to our database

// Logging
app.use(expressWinston.logger({
  transports: [
    new winston.transports.File({
      level: 'silly',
      filename: `${appRoot}/logs/app.log`,
      handleExceptions: true,
      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    })
  ],
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  msg: "HTTP {{req.method}} {{req.url}} {{res.responseTime}}ms {{Date.now()}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: false, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  requestWhitelist: ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body'],
  timestamp: true,
  ignoreRoute: function (req, res) { return false } // optional: allows to skip some log messages based on request and/or response
}))

// Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  debug: true
})

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler())

// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler())

Sentry.captureMessage('Application started')

app.use(cookieParser()) // read cookies (needed for auth)
app.use(bodyParser.json())
app.use(serveStatic(path.join(__dirname, '../instances')))
app.use(fileUpload())

// Instance middleware
app.use(function (req, res, next) {
  const url = req.get('Referrer')
  let instance
  if (url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i)
    const domain = matches[1]
    const subdomain = domain.split('.')[0]
    // Set default instance if on localhost
    instance = (domain.indexOf('local') !== -1) ? process.env.DEFAULT_INSTANCE : subdomain
  }
  req.instance = instance

  next()
})

app.use(session({
  store: new RedisStore({
    host: process.env.REDIS_HOST || 'redis',
    port: 6379
  }),
  secret: process.env.PASSPORT_SESSION_SECRET || 'not_very_secret',
  resave: false,
  saveUninitialized: true
}))

// required for passport
app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in session

app.get('/health',
  (req, res) => {
    res.sendStatus(200)
  })

app.get('/',
  (req, res) => {
    res.send('Connected Academy API')
  })
  
require('./app/routes/auth.js')(app, passport, io)
require('./app/routes/classroom.js')(app, passport, io)
require('./app/routes/course.js')(app, passport, io)
require('./app/routes/editor.js')(app, passport, io)
require('./app/routes/homework.js')(app, passport, io)
require('./app/routes/message.js')(app, passport, io)
require('./app/routes/user.js')(app, passport, io)

fakeActivity = () => {
  const activity = require('./app/activity.js')(io)
  activity.classActivity()
  activity.homeworkSubmissions()
  setTimeout(() => { activity.homeworkMessages() }, 5000)
}

fakeResponder = () => {
  const responder = require('./app/responder.js')(io)
  responder.start()
}

startListener = () => {
  const listener = require('./app/listener.js')(io)
  listener.start()
}

replayClass = () => {
  const replay = require('./app/replay.js')(io)
  replay.start()
}

http.listen(port, () => {
  console.log(`Starting API on port ${port}`)
  // fakeActivity()
  // fakeResponder()
  replayClass()
  startListener()
})
