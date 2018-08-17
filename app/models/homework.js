const mongoose = require('mongoose')

const homeworkSchema = mongoose.Schema({

  _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  _messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HomeworkMessage' }],
  course: String,
  class: String,
  content: String,
  url: String,
  description: String,
  created: Date,
  destroyed: Date

})

homeworkSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()
  next()
})

homeworkSchema.pre('findOne', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile twitter')
  this.populate('_messages')
  next()
})

homeworkSchema.pre('find', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile twitter')
  next()
})

module.exports = mongoose.model('Homework', homeworkSchema)
