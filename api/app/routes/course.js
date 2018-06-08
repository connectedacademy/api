const moment = require('moment')
const utils = require('../utilities/utils.js')()
const YamlObj = require('../utilities/yamlObj')

module.exports = function (app, passport, io) {

  // Get course
  app.get('/v1/course',
    async (req, res) => {
      // Load example course
      let yamlObj = new YamlObj(req.instance)
      let course = await yamlObj.loadFile('/course.yaml', true)

      // Check releases
      course.classes.forEach(o => {
        if (moment().startOf('day').isSameOrAfter(moment(o.date, "MM-DD-YYYY").startOf('day'))) {
          o.released = true // Class is released
        }
        if (moment().startOf('day').isSame(moment(o.date, "MM-DD-YYYY").startOf('day'))) {
          o.active = true // Class is active
        }
      })

      // Set CDN
      course.cdn = `${process.env.CDN_URL}/${course.slug}`

      // Return course as json
      res.json(course)
    })

  // Get class for given id
  app.get('/v1/class/:id',
    async (req, res) => {
      // Load example class
      let yamlObj = new YamlObj(req.instance)
      let theClass = await yamlObj.loadFile(`/classes/${req.params.id}/config.yaml`, true)

      // Return class as json
      res.json(theClass)
    })

  // Get course content
  app.get('/v1/content/:content',
    async (req, res) => {
      const requestedPath = decodeURIComponent(req.params.content)
      let path
      if (requestedPath.indexOf('/') === -1) {
        path = `content/${requestedPath}.md`
      } else {
        path = `classes/${requestedPath}.md`
      }

      // Check for local file
      try {
        let raw = await fs.readFile(utils.resolve(req.instance, path), 'utf8')
        res.send(utils.formatMarkdown(raw.toString(), req.instance))
      } catch (error) {
        // No local file
        console.log('error', error)
        res.send('Content could not be loaded')
      }
    })

  // Get class media
  app.get('/v1/media/:class/:filename',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/${req.params.filename}`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.params.class}/${req.params.filename}`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load media')
      }
    })

  // Get class transcript
  app.get('/v1/transcript/:class/:filename',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/${req.params.filename}`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.params.class}/${req.params.filename}`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load transcript')
      }
    })
}
