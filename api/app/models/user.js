const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')

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

module.exports = mongoose.model('User', userSchema)
