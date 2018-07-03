var path = require('path')
let fs = require('fs-promise')
let parseSRT = require('parse-srt')

const math = require('lodash/math')

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
    loadLocalTranscript: async (instance, filename) => {
      
      // Check for local file
      let srtPath = resolve(instance, `${filename}.srt`)
      let jsonPath = resolve(instance, `${filename}.json`)

      let jsonFile

      try {
        let err = await fs.access(jsonPath)
      } catch (error) {
        console.log('JSON not found - writing..');
        let file = await fs.readFile(srtPath, 'utf8')
        let json = parseSRT(file)
        let theTranscript = {}

        for (var transcript of json) {
          const segmentGroup = parseInt(math.divide(math.floor(transcript.start + 2.5), 5))
          const text = transcript.text.replace(/<br \/>/g, ' ')
          theTranscript[segmentGroup] = (theTranscript[segmentGroup]) ? theTranscript[segmentGroup] + ' ' + text : text
        }
        jsonFile = await fs.writeFile(jsonPath, JSON.stringify(theTranscript))
      } finally {
        console.log('JSON found');
        jsonFile = await fs.readFile(jsonPath, 'utf8')
        return jsonFile
      }
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
      } finally {
        console.log('JSON found');
        jsonFile = await fs.readFile(jsonPath, 'utf8')
        return jsonFile
      }
    }
  }
}