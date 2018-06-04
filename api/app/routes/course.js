var path = require('path')
let yaml = require('js-yaml')
let fs = require('fs-promise')
let moment = require('moment')
let request = require('request')
let parseSRT = require('parse-srt')

function resolve(instance, dir) {
  return path.join(__dirname, `../../examples/${instance}`, dir)
}

const coursePath = (course) => {
  return `https://raw.githubusercontent.com/connectedacademy/${course}/master`
}

function formatMarkdown(raw, course) {
  let markdown = raw
  markdown = markdown.replace(/{{site.baseurl}}/g, coursePath(course))
  markdown = markdown.replace(/thumb/g, '')
  return markdown
}

async function loadLocalFile(instance, filename) {

  // Check for local file
  let srtPath = resolve(instance, `${filename}.srt`)
  let jsonPath = resolve(instance, `${filename}.json`)

  let err = await fs.access(jsonPath)
  let jsonFile
  if (err) {
    console.log('JSON file not found - writing file...');
    let file = await fs.readFile(srtPath, 'utf8')
    jsonFile = await fs.writeFile(jsonPath, JSON.stringify(parseSRT(file)))
    return jsonFile
  } else {
    console.log('JSON file found!');
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
      let raw = await fs.readFile(resolve(req.instance, `/classes/${req.params.id}/config.yaml`), 'utf8')
      // Return class as json
      res.json(yaml.safeLoad(raw))
    })

  // Get course content
  app.get('/v1/content/:content',
    async (req, res) => {

      let path = `/classes/${decodeURIComponent(req.params.content)}.md`

      // Check for local file
      try {
        let raw = await fs.readFile(resolve(req.instance, path), 'utf8')
        console.log('Found local file')
        res.send(formatMarkdown(raw.toString(), req.instance))
      } catch (error) {
        console.log('No local file - loading remote file')
        // No local file, try load remote file
        res.send('Content could not be loaded')
      }
    })

  // Get class audio
  app.get('/v1/audio/:class/:filename',
    async (req, res) => {

      // let url = 'https://github.com/connectedacademy/rocket/raw/master/course/content/audio/self-portraits-32.mp3'
      // request(url).pipe(res)

      try {
        console.log(`Attempting to load a file - ${resolve(req.instance, `classes/${req.params.class}/${req.params.filename}`)}`);
        const file = await fs.readFile(resolve(req.instance, `classes/${req.params.class}/${req.params.filename}`))
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(file)
      } catch (error) {
        res.send('Failed to load audio')
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
        res.send('Failed to load transcript')
      }
    })

  // Get class image
  app.get('/v1/images/:size/:filename',
    async (req, res) => {
      try {
        let file = await fs.readFile(resolve(req.instance, `images/${req.params.filename}`))
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(file)
      } catch (error) {
        res.send('Failed to load image')
      }
      // res.setHeader("content-disposition", `attachment; filename=${req.params.filename}`);
      // request(`${coursePath(req.instance)}/course/content/media/${req.params.filename}`).pipe(res)
    })
}
