const moment = require('moment')
const fs = require('fs-promise')
const YAML = require('json2yaml')

const _find = require('lodash/find')
const _reduce  = require('lodash/reduce')

const utils = require('../utilities/utils.js')()
const YamlObj = require('../utilities/yamlObj')
const media = require('../utilities/media.js')()

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
    
  // Get class suggestions
  app.get('/v1/suggestions/:class',
    async (req, res) => {
      try {
        const filename = `${req.params.class}-prompts`
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/${filename}`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.params.class}/${filename}`)
        const result = _reduce(JSON.parse(file), function (result, value, key) {
          if (!result) result = []
          result[Math.floor(value.start / 5)] = value.text
          return result
        }, {})
        res.send(result)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load suggestions')
      }
    })

  // Get class transcript
  app.get('/v1/transcript/:class/:filename',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/${req.params.filename}`}`);
        const file = await utils.loadLocalTranscript(req.instance, `classes/${req.params.class}/${req.params.filename}`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load transcript')
      }
    })

  // Update class transcript
  app.post('/v1/transcript/:class',
    async (req, res) => {
      try {
        let yamlObj = new YamlObj(req.instance)
        let theClass = await yamlObj.loadFile(`/classes/${req.body.theClass}/config.yaml`, true)
        console.log(`Updating transcript for ${req.body.theClass}`)
        let content = _find(theClass.content, { type: 'liveclass' })

        console.log(`Attempting to load a file - ${`classes/${req.body.theClass}/${content.transcript}`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.body.theClass}/${content.transcript}`)
        
        // Update file and save
        let json = JSON.parse(file)
      
        json[req.body.id] = req.body.text
        
        let jsonPath = utils.resolve(req.instance, `classes/${req.body.theClass}/${content.transcript}.json`)
        let toWrite = JSON.stringify(json)
        
        let jsonFile = await fs.writeFile(jsonPath, toWrite)
        jsonFile = await fs.readFile(jsonPath)
        
        res.send(JSON.parse(jsonFile))
      } catch (error) {
        console.log('error', error)
        res.send('Failed to update transcript')
      }
    })

  // Upload audio to S3
  app.post('/v1/audio/upload',
    async (req, res) => {

      const file = req.files.upload

      // Save file locally
      const uploadPath = utils.resolve(req.instance, `classes/${req.body.theClass}/audio/${file.name}`)
      const uploadedFile = await fs.writeFile(uploadPath, req.files.upload.data)

      console.log('uploadedFile', uploadedFile)

      let s3filename = `${req.instance}-${req.body.theClass}`
      switch (req.body.type) {
        case 'introAudioFile':
          // Generate unique filename
          s3filename = s3filename + `-${Date.now()}-intro`
          break
        case 'mainAudioFile':
          // Overwrite previous file
          s3filename = s3filename + '-main'
          break
      }

      // Upload to S3
      let result = await media.uploadFile(uploadPath, s3filename)

      // Add new intro to class config
      if (req.body.type === 'introAudioFile') {
        // Load config
        let yamlObj = new YamlObj(req.instance)
        const configPath = `/classes/${req.body.theClass}/config.yaml`
        let theClass = await yamlObj.loadFile(configPath, true)

        // Get location
        let location = result
        location = location.replace('.mp3', '-64.mp3')
        location = location.replace('audio', process.env.ENCODED_AUDIO_URI)

        // Push onto intros array
        let newIntro = {
          audio: location,
          title: 'Introduction'
        }
        theClass.content[1].intros.push(newIntro)

        let yamlPath = utils.resolve(req.instance, configPath)
        let toWrite = YAML.stringify(theClass)

        let yamlFile = await fs.writeFile(yamlPath, toWrite)
        yamlFile = await fs.readFile(yamlPath)
      }
      res.send(result)
    }
  )

  // Fetch transcription for given class
  app.get('/v1/transcription/fetch/:class',
    async (req, res) => {

      const course = req.instance
      const theClass = req.params.class
      const filename = `${course}-${theClass}-main.json`
      let result = await media.fetchTranscription(course, theClass, filename)

      console.log('Fetch transcription result', result)
      
      res.send('done')
    }
  )
}
