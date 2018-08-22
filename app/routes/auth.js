const User = require('../../app/models/user')

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
      const roles = await user.setRoles(req.instance)
      user = user.toObject()
      user.roles = roles

      // Remove sensitive values
      delete user.twitter.token
      delete user.twitter.tokenSecret

      // Log user
      console.log('user', user)

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
      successRedirect: process.env.DEV_MODE ? `http://ca.local:8080/profile` : `https://${req.params.instance}.connectedacademy.io/profile`,
      failureRedirect: process.env.DEV_MODE ? `http://ca.local:8080/auth` : `https://${req.params.instance}.connectedacademy.io/auth`
    })(req, res, next)
  })
}
