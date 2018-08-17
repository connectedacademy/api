const utils = require('./utils.js')()
let yaml = require('js-yaml')
let fs = require('fs-promise')

class YamlObj {
  constructor(course) {
    this.course = course
  }
  async loadFile(path, toJson) {
    this.file = await fs.readFile(utils.resolve(this.course, path), 'utf8')
    this.format()
    if (toJson) {
      return this.toJson()
    }
  }
  format() {
    this.file = utils.formatMarkdown(this.file, this.course)
  }
  toJson() {
    return yaml.safeLoad(this.file)
  }
}

module.exports = YamlObj