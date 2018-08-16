const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const YamlObj = require('../utilities/yamlObj')

const userSchema = mongoose.Schema({

  profile: {
    name: String,
    avatar: String,
    bio: String,
    subscription: String
  },
  local: {
    email: String,
    password: String
  },
  twitter: {
    id: String,
    token: String,
    tokenSecret: String,
    username: String,
    displayName: String
  },
  // _permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  code: String,
  created: Date

}, { usePushEach: true })

userSchema.index({ 'local.email': 'text', 'profile.name': 'text' });

userSchema
  .virtual('profile.id')
  .get(function () {
    return this.id
  })

userSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()
  next()
})

userSchema.pre('findOne', function (next) {
  // this.populate('_permissions')
  next()
})

userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
}

userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.local.password)
}

userSchema.methods.checkRole = async function (instance, role) {

  console.log('Checking role', instance, role, this.profile.name)
  
  // Load course
  let yamlObj = new YamlObj(instance)
  let course = await yamlObj.loadFile('/course.yaml', true)

  switch (role) {
    case 'admin':
      return course.admins.indexOf(this.twitter.username.toLowerCase()) !== -1
    case 'teacher':
      return course.teachers.indexOf(this.twitter.username.toLowerCase()) !== -1
    default:
      return false
  }
}

userSchema.methods.setRoles = async function (instance) {

  // Load course
  let yamlObj = new YamlObj(instance)
  let course = await yamlObj.loadFile('/course.yaml', true)

  return {
    admin: course.admins.indexOf(this.twitter.username.toLowerCase()) !== -1,
    teacher: course.teachers.indexOf(this.twitter.username.toLowerCase()) !== -1
  }
}

module.exports = mongoose.model('User', userSchema)
