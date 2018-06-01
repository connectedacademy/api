const Homework = require('../../app/models/homework')

module.exports = function (app, passport, io) {
  
  // Get a users homework for a given class
  app.get('/v1/user/homeworks/:class?',
    async (req, res) => {
      const homeworks = await Homework.find({ _user: req.user, class: req.params.class })
      res.json(homeworks)
    })
}
