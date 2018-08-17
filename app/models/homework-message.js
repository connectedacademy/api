const mongoose = require('mongoose')

const homeworkMessageSchema = mongoose.Schema({

  _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  _target: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  text: String,
  created: Date,
  destroyed: Date

})

homeworkMessageSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()
  next()
})

homeworkMessageSchema.pre('findOne', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile twitter')
  next()
})

homeworkMessageSchema.pre('find', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile twitter')
  next()
})

module.exports = mongoose.model('HomeworkMessage', homeworkMessageSchema)
