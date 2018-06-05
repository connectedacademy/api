var path = require('path')
let yaml = require('js-yaml')
let fs = require('fs-promise')
let moment = require('moment')
let request = require('request')
let parseSRT = require('parse-srt')

function YamlObj(file, course) {
  this.file = file
  this.course = course

  this.format = () => {
    this.file = formatMarkdown(this.file, this.course)
  }
  this.toJson = () => {
    return yaml.safeLoad(this.file)
  }
}

function resolve(instance, dir) {
  return path.join(__dirname, `../../examples/${instance}`, dir)
}

const coursePath = (course) => {
  return `${process.env.CDN_URL}/${course}`
}

function formatMarkdown(raw, course) {
  return raw.replace(/CDN_URL/g, coursePath(course))
}

async function loadLocalFile(instance, filename) {

  // Check for local file
  let srtPath = resolve(instance, `${filename}.srt`)
  let jsonPath = resolve(instance, `${filename}.json`)

  let jsonFile
  
  try {
    let err = await fs.access(jsonPath)
  } catch (error) {
    console.log('JSON not found - writing..');
    let file = await fs.readFile(srtPath, 'utf8')
    jsonFile = await fs.writeFile(jsonPath, JSON.stringify(parseSRT(file)))
    return jsonFile
  } finally {
    console.log('JSON found');
    jsonFile = await fs.readFile(jsonPath, 'utf8')
    return jsonFile
  }
}

module.exports = function (app, passport, io) {

  // Get course
  app.get('/v1/course',
    async (req, res) => {
      // Load example course
      let raw = await fs.readFile(resolve(req.instance, '/course.yaml'), 'utf8')
      let course = yaml.safeLoad(raw)
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
      let yamlObj = new YamlObj()
      yamlObj.file = await fs.readFile(resolve(req.instance, `/classes/${req.params.id}/config.yaml`), 'utf8')
      yamlObj.course = req.instance
      yamlObj.format()
      console.log('yamlObj', yamlObj)
      
      // Return class as json
      res.json(yamlObj.toJson())
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
        let raw = await fs.readFile(resolve(req.instance, path), 'utf8')
        console.log('Found local file')
        res.send(formatMarkdown(raw.toString(), req.instance))
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
        const file = await loadLocalFile(req.instance, `classes/${req.params.class}/${req.params.filename}`)
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
        const file = await loadLocalFile(req.instance, `classes/${req.params.class}/${req.params.filename}`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load transcript')
      }
    })
}
