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
      // Convert to standard object so roles can be set
      user = user.toObject()
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
  app.get('/v1/auth/twitter/login', function (req, res, next) {
    passport.authenticate('twitter', { callbackURL: `${process.env.API_URL}/auth/twitter/callback` })(req, res, next)
  })

  // Twitter callback
  app.get('/v1/auth/twitter/callback', function (req, res, next) {
    passport.authenticate('twitter', {
      callbackURL: `${process.env.API_URL}/auth/twitter/callback`,
      successRedirect: `${req.instance}.${process.env.REDIR_URL}/profile`,
      failureRedirect: `${req.instance}.${process.env.REDIR_URL}/auth`
    })(req, res, next)
  })

}
