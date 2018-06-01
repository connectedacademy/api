const _map = require('lodash/map')
const _includes = require('lodash/includes')
const _find = require('lodash/find')
const randomStr = require('randomstring')

const Classroom = require('../../app/models/classroom')

module.exports = function (app, passport, io) {
  
  // Get classroom code for given class
  app.get('/v1/classroom/mycode/:class',
    async (req, res) => {
      // Find or create code
      let codes = await Classroom.find({}, 'code')
      codes = _map(codes, o => o.code);
      let found = false
      let newcode
      while (!found) {
        newcode = randomStr.generate({
          length: 4,
          charset: 'alphabetic',
          capitalization: 'uppercase',
          readable: true
        })
        if (!_includes(codes, newcode)) { found = true }
      }

      let classroom = new Classroom({
        _user: req.user,
        course: req.instance,
        class: req.params.class,
        code: newcode
      })
      classroom = await classroom.save()
      // Return classroom
      res.json(classroom)
    })

  // Get classroom codes for given class
  app.get('/v1/teacher/classrooms/:class',
    async (req, res) => {
      // Get classrooms
      const classrooms = await Classroom.find({ _user: req.user, class: req.params.class })
      // Return classrooms
      res.json(classrooms)
    })

  // Get students for a given class
  app.get('/v1/teacher/students/:class',
    async (req, res) => {
      // Get students
      const classroom = await Classroom.findOne({ _user: req.user, class: req.params.class })
      // Return students
      res.json(classroom._students)
    })

  // Join current user to a classroom
  app.post('/v1/classroom/inclass',
    async (req, res) => {
      // Join classroom
      let classroom = await Classroom.findOne({ code: req.body.code })
      // Unique
      const result = _find(classroom._students, { _id: req.user._id })
      if (!result) {
        classroom._students.push(req.user)
      }
      console.log('find:', result)
      classroom = await classroom.save()
      // Return classrooms
      res.json(classroom)
    })
}
