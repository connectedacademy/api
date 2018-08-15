const User = require('../../app/models/user')
const YamlObj = require('../utilities/yamlObj')

module.exports = function (app, passport, io) {

  // Return the current user
  app.get('/v1/auth/me',
    async (req, res) => {
      if (!req.user) {
        return res.json({
          status: 'Not authenticated',
          user: undefined
        })
      }

      // Find user
      let user = await User.findOne({ _id: req.user._id })
      user = user.toObject()

      // Remove sensitive values
      delete user.twitter.token
      delete user.twitter.tokenSecret

      // Log user
      console.log('user', user)

      // Load course
      let yamlObj = new YamlObj(req.instance)
      let course = await yamlObj.loadFile('/course.yaml', true)

      // Check if user is admin
      user.isAdmin = course.admins.indexOf(user.twitter.username.toLowerCase()) !== -1
      user.isTeacher = course.teachers.indexOf(user.twitter.username.toLowerCase()) !== -1

      // TODO: Set user roles
      user.roles = ['admin', 'teacher', 'user']

      res.json({ user: user })
    })

  // Logout (destroy the current session)
  app.get('/v1/auth/logout', (req, res) => {
    req.logout()
    res.json({
      status: 'unauthenticated',
      user: undefined
    })
  })

  // Twitter login
  app.get('/v1/auth/twitter/login/:instance', function (req, res, next) {
    passport.authenticate('twitter', { callbackURL: `${process.env.API_URL}/auth/twitter/callback/${req.params.instance}` })(req, res, next)
  })

  // Twitter callback
  app.get('/v1/auth/twitter/callback/:instance', function (req, res, next) {
    console.log(`${process.env.API_URL}/auth/twitter/callback/${req.params.instance}`)
    passport.authenticate('twitter', {
      callbackURL: `${process.env.API_URL}/auth/twitter/callback/${req.params.instance}`,
      successRedirect: process.env.DEV_MODE ? `http://localhost:8080/profile` : `https://${req.params.instance}.connectedacademy.io/profile`,
      failureRedirect: process.env.DEV_MODE ? `http://localhost:8080/auth` : `https://${req.params.instance}.connectedacademy.io/auth`
    })(req, res, next)
  })
}
