const LocalStrategy = require('passport-local').Strategy
const TwitterStrategy = require('passport-twitter').Strategy;
const User = require('../app/models/user')

const configAuth = require('./auth')

module.exports = function (passport) {
  
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  // Deserialize user
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user)
    })
  })

  // Signup
  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
    (req, email, password, done) => {
      process.nextTick(function () {
        User.findOne({ 'local.email': email }, (err, user) => {
          if (err) { return done(err) }
          if (user) { return done(null, false, 'That email is already taken.') }

          const newUser = new User()
          newUser.profile.name = req.body.name
          newUser.local.email = email
          newUser.local.password = newUser.generateHash(password)

          newUser.save((saveErr) => {
            if (saveErr) { throw saveErr }
            return done(null, newUser)
          })
        })
      })
    }))

  // Login
  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
    (req, email, password, done) => {
      User.findOne({ 'local.email': email }, (err, user) => {
        if (err) { return done(null, false) }
        if (!user) { return done(null, false, 'No user found.') }
        if (!user.validPassword(password)) { return done(null, false, 'Oops! Wrong password.') }

        return done(null, user)
      })
    }))

  // Twitter authentication
  passport.use(new TwitterStrategy({
    consumerKey: configAuth.twitterAuth.clientID,
    consumerSecret: configAuth.twitterAuth.clientSecret,
    callbackURL: configAuth.twitterAuth.callbackURL,
    passReqToCallback: true
  },
    function (req, token, tokenSecret, profile, cb) {

      process.nextTick(function () {

        User.findOne({ 'twitter.id': profile.id }, function (err, user) {

          if (err) { return cb(err, user, req.query.instance) }

          if (user) { return cb(null, user, req.query.instance) }

          let newUser = new User()

          newUser.twitter.id = profile.id
          newUser.twitter.token = tokenSecret
          newUser.twitter.username = profile.username
          newUser.twitter.displayName = profile.displayName

          newUser.profile.avatar = profile.profile_image_url
          newUser.profile.name = profile.displayName

          if (profile.photos && (profile.photos.length > 0)) {
            newUser.profile.avatar = profile.photos[0].value
          }

          newUser.save(function (err) {
            if (err) { throw err }
            return cb(err, newUser, req.query.instance)
          })
        })
      })

    }
  ))
}
