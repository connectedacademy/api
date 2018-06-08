require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const mongoose = require('mongoose')

const port = process.env.PORT || 3000
const passport = require('passport')
const flash = require('connect-flash')
const serveStatic = require('serve-static')

const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)

const configDB = require('./config/database.js')

const app = express()
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
  origin: ['http://localhost:8080', 'https://connectedacademy.io', /\.connectedacademy\.io$/],
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  headers: ['X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version']
}))

mongoose.connect(configDB.url) // connect to our database

// set up our express application
app.use(morgan('dev')) // log every request to the console
app.use(cookieParser()) // read cookies (needed for auth)
app.use(bodyParser.json())
app.use(serveStatic(path.join(__dirname, 'examples')))

// Instance middleware
app.use(function (req, res, next) {
  const url = req.get('Referrer')
  let instance
  if (url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i)
    const domain = matches[1]
    const subdomain = domain.split('.')[0]
    instance = (subdomain.indexOf('localhost') !== -1) ? 'rocket' : subdomain
  }
  req.instance = instance

  next()
})

app.use(session({
  store: new RedisStore({
    // client: ,
    // socket: ,
    // url: ,
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
  responder.begin()
}

http.listen(port, () => {
  console.log(`Listening on port ${port}!`)
  // fakeActivity()
  // fakeResponder()
})
