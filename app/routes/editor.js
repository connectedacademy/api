const fs = require('fs-promise')
const utils = require('../utilities/utils.js')()
const YamlObj = require('../utilities/yamlObj.js')
const YAML = require('json2yaml')

async function updateFile(instance, markdown, path) {

  let filePath = utils.resolve(instance, path)
  await fs.writeFile(filePath, markdown)
  return await fs.readFile(filePath)
}

async function saveConfig(instance, classConfig, path) {
  let toWrite = YAML.stringify(classConfig)
  let filePath = utils.resolve(instance, path)
  await fs.writeFile(filePath, toWrite)
}

async function ensureRole(req, role) {
  // Ensure user has given role for instance
  if (!await req.user.checkRole(req.instance, role)) {
    return res.send('You must be an admin!')
  }
}

module.exports = function (app, passport, io) {
  
  // Save content
  app.post('/v1/editor/save/:type',
    async (req, res) => {
      await ensureRole(req, 'admin')

      let yamlObj = new YamlObj(req.instance)
      const courseConfigPath = '/course.yaml'
      
      if (req.params.type === 'course') {
        console.log('Updating course...')
        let courseConfig = await yamlObj.loadFile(courseConfigPath, true)

        courseConfig = {
          ...courseConfig,
          ...req.body.properties
        }

        await saveConfig(req.instance, courseConfig, '/course.yaml')

        return res.json({ success: true, courseConfig: courseConfig })
      }

      if (req.params.type === 'page') {
        console.log('Updating page...', req.body.path)
        await updateFile(req.instance, req.body.markdown, req.body.path)
        return res.json({ success: true })
      }

      if (req.params.type === 'schedule') {
        console.log('Updating schedule...')
        let courseConfig = await yamlObj.loadFile(courseConfigPath, true)

        courseConfig.classes[req.body.index] = {
          ...courseConfig.classes[req.body.index],
          ...req.body.properties
        }

        await saveConfig(req.instance, courseConfig, '/course.yaml')

        return res.json({ success: true, courseConfig: courseConfig })
      }

      if (req.params.type === 'content') {
        console.log('Updating content...')
        const classConfigPath = `/classes/${req.body.class}/config.yaml`
        
        let classConfig = await yamlObj.loadFile(classConfigPath, true)
        
        // Load content from JSON that is to be updated
        classConfig.content[req.body.index] = {
          ...classConfig.content[req.body.index],
          ...req.body.properties
        }
        console.log('classConfig.content[req.body.index]', classConfig.content[req.body.index])
        

        await saveConfig(req.instance, classConfig, classConfigPath)

        return res.json({ success: true, classConfig: classConfig })
      }
    })
}
