const moment = require('moment')
const fs = require('fs-promise')
const YAML = require('json2yaml')

const utils = require('../utilities/utils.js')()
const YamlObj = require('../utilities/yamlObj')
const media = require('../utilities/media.js')()

async function ensureRole(req, role) {
  // Ensure user has given role for instance
  if (!await req.user.checkRole(req.instance, role)) {
    return res.send('You must be an admin!')
  }
}

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
  app.get('/v1/media/:class',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/media`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.params.class}/media`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load media')
      }
    })
    
  // Get class prompts
  app.get('/v1/prompts/:class',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/prompts`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.params.class}/prompts`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load prompts')
      }
    })

  // Get class transcript
  app.get('/v1/transcript/:class',
    async (req, res) => {
      try {
        console.log(`Attempting to load a file - ${`classes/${req.params.class}/transcript`}`);
        const file = await utils.loadLocalTranscript(req.instance, `classes/${req.params.class}/transcript`)
        res.send(file)
      } catch (error) {
        console.log('error', error)
        res.send('Failed to load transcript')
      }
    })

  // Update class transcript
  app.post('/v1/transcript/:class',
    async (req, res) => {
      await ensureRole(req, 'admin')
      
      try {
        console.log(`Attempting to load a file - ${`classes/${req.body.theClass}/transcript`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.body.theClass}/transcript`)

        // Update file and save
        let json = JSON.parse(file)

        json[req.body.id] = req.body.text

        let jsonPath = utils.resolve(req.instance, `classes/${req.body.theClass}/transcript.json`)
        let toWrite = JSON.stringify(json, null, "\t")

        let jsonFile = await fs.writeFile(jsonPath, toWrite)
        jsonFile = await fs.readFile(jsonPath)

        res.send(JSON.parse(jsonFile))
      } catch (error) {
        console.log('error', error)
        res.send('Failed to update transcript')
      }
    })

  // Update class prompts
  app.post('/v1/prompts/:class',
    async (req, res) => {
      await ensureRole(req, 'admin')

      try {
        console.log(`Attempting to load a file - ${`classes/${req.body.theClass}/prompts`}`);
        const file = await utils.loadLocalFile(req.instance, `classes/${req.body.theClass}/prompts`)

        // Update file and save
        let json = JSON.parse(file)

        json[req.body.id] = req.body.text

        let jsonPath = utils.resolve(req.instance, `classes/${req.body.theClass}/prompts.json`)
        let toWrite = JSON.stringify(json, null, "\t")

        let jsonFile = await fs.writeFile(jsonPath, toWrite)
        jsonFile = await fs.readFile(jsonPath)

        res.send(JSON.parse(jsonFile))
      } catch (error) {
        console.log('error', error)
        res.send('Failed to update prompts')
      }
    })

  // Upload audio to S3
  app.post('/v1/audio/upload',
    async (req, res) => {
      await ensureRole(req, 'admin')

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
      let result = await media.uploadFile(uploadPath, s3filename, 'audio')

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

        await fs.writeFile(yamlPath, toWrite)
      }
      res.send(result)
    }
  )

  // Upload media to S3
  app.post('/v1/media/upload',
    async (req, res) => {
      await ensureRole(req, 'admin')

      const upload = req.files.upload

      // Save file locally
      const uploadPath = utils.resolve(req.instance, `media/${upload.name}`)
      const uploadedFile = await fs.writeFile(uploadPath, req.files.upload.data)

      console.log('uploadedFile', uploadedFile)

      let s3filename = `${req.instance}-${req.body.theClass}`
      
      // Generate unique filename
      s3filename = s3filename + `-${Date.now()}-media`

      // Upload to S3
      let result = await media.uploadFile(uploadPath, s3filename, 'media')

      console.log(`Attempting to load a file - ${`classes/${req.body.theClass}/media`}`);
      const file = await utils.loadLocalFile(req.instance, `classes/${req.body.theClass}/media`)

      console.log('result', result)
      
      // Update file and save
      let json = JSON.parse(file)
      json[req.body.theSegment] = {
        text: `${result}`
      }

      json = json.map(o => {
        return o || { text: undefined }
      })

      console.log('json', json)

      let jsonPath = utils.resolve(req.instance, `classes/${req.body.theClass}/media.json`)
      let toWrite = JSON.stringify(json, null, "\t")

      let jsonFile = await fs.writeFile(jsonPath, toWrite)
      jsonFile = await fs.readFile(jsonPath)

      res.send(JSON.parse(jsonFile))
    }
  )

  // Fetch transcription for given class
  app.get('/v1/transcription/fetch/:class',
    async (req, res) => {
      await ensureRole(req, 'admin')

      const course = req.instance
      const theClass = req.params.class
      const filename = `${course}-${theClass}-main.json`
      let result = await media.fetchTranscription(course, theClass, filename)

      console.log('Fetch transcription result', result)
      
      res.send('done')
    }
  )

  // Convert existing media
  app.get('/convert', async (req, res) => {
    await ensureRole(req, 'admin')

    return res.send('Disabled')
    
    // Load files
    const file = await utils.loadLocalFile('rocket', `classes/coming-clean/media`)
    let jsonPath = utils.resolve('rocket', `classes/coming-clean/media.json`)

    let json = JSON.parse(file)

    // Loop files
    for (const key in json) {

      let thePath = `media/${json[key].text}`
      
      const uploadPath = utils.resolve('rocket', thePath)

      // Generate unique filename
      let s3filename = `rocket-coming-clean-${Date.now()}-media`

      // Upload to S3
      let result = await media.uploadFile(uploadPath, s3filename, 'media')
      console.log('result', result)
      
      // Update file and save
      json[key] = {
        text: `${result}`
      }

      let toWrite = JSON.stringify(json, null, "\t")

      // Write file
      await fs.writeFile(jsonPath, toWrite)
      await fs.readFile(jsonPath)
    }
    let jsonFile = await fs.readFile(jsonPath)
    res.send(jsonFile)
  })
}
