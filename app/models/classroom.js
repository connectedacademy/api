const mongoose = require('mongoose')

const classroomSchema = mongoose.Schema({

  _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: String,
  class: String,
  code: String,
  _students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  created: Date,
  destroyed: Date

})

classroomSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()
  next()
})

classroomSchema.pre('findOne', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile')
  this.populate('_students')
  next()
})

classroomSchema.pre('find', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile')
  this.populate('_students')
  next()
})

module.exports = mongoose.model('Classroom', classroomSchema)
