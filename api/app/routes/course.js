var path = require('path')
let yaml = require('js-yaml')
let fs = require('fs-promise')
let moment = require('moment')

function resolve(dir) {
  const example = 'doa'
  return path.join(__dirname, `../../examples/${example}`, dir)
}

module.exports = function (app, passport, io) {

  // Get course
  app.get('/v1/course',
    async (req, res) => {
      // Load example course
      let raw = await fs.readFile(resolve('/course.yaml'))
      let course = yaml.safeLoad(raw)
      course.classes.forEach(o => {
        if (moment().startOf('day').isSameOrAfter(moment(o.date).startOf('day'))) {
          o.released = true // Class is released
        }
        if (moment().startOf('day').isSame(moment(o.date).startOf('day'))) {
          o.active = true // Class is active
        }
      })
      // Return course as json
      res.json(course)
    })

  // Get class for given id
  app.get('/v1/class/:id',
    async (req, res) => {
      // Load example class
      let raw = await fs.readFile(resolve(`/classes/${req.params.id}.yaml`))
      // Return class as json
      res.json(yaml.safeLoad(raw))
    })
}
