var path = require('path')
let yaml = require('js-yaml')
let fs = require('fs-promise')
let moment = require('moment')
let parseSRT = require('parse-srt')

function resolve (instance, dir) {
  return path.join(__dirname, `../../examples/${instance}`, dir)
}

module.exports = function () {
  return {
    resolve: (instance, dir) => {
      return path.join(__dirname, `../../examples/${instance}`, dir)
    },
    formatMarkdown: (raw, course) => {
      return raw.replace(/CDN_URL/g, `${process.env.CDN_URL}/${course}`)
    },
    loadLocalFile: async (instance, filename) => {

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
  }
}