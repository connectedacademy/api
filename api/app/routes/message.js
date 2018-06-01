const Message = require('../../app/models/message')
const Classroom = require('../../app/models/classroom')

module.exports = function (app, passport, io) {
  
  // Get visualisation for given class and duration
  app.get('/v1/messages/vis/:class/:duration',
    async (req, res) => {
      let vis = await Message.aggregate([{ $match: { class: req.params.class } }, { $group: { _id: "$segment", count: { $sum: 1 } } }])
      let max = Math.max.apply(Math, vis.map(o => o.count))
      let result = {}
      let groups = {}

      for (let v of vis) {
        let segment = parseInt(v._id)
        let percent = Math.floor((segment / (req.params.duration / 5)) * 100)
        let val = parseInt(v.count) / max
        
        if (result[percent]) {
          result[percent] = result[percent] + val
          groups[percent] = groups[percent] ? groups[percent] + 1 : 2
        } else {
          result[percent] = val
        }
      }

      for (let key in groups) {
        result[key] = result[key] / groups[key]
      }
      let fill = 0
      while (fill <= 100) {
        result[fill] = result[fill] ? result[fill] : 0
        fill++
      }

      res.json({
        visualisation: result
      })
    })

  // Create message
  app.post('/v1/messages/create',
    async (req, res) => {
      const data = {
        _user: req.user,
        _parent: req.body.replyTo,
        course: 'rocket',
        class: req.body.currentClass,
        segment: req.body.currentSegmentGroup,
        segmentGroup: req.body.currentSegmentGroup,
        text: req.body.text
      }
      let message = new Message(data)
      message = await message.save()
      
      const messageCount = await Message.count({ class: message.class, segment: message.segment })
      message = message.toObject()
      message.total = messageCount

      // Notify users
      io.to('class').emit('message', message)
      io.to('class').emit('visualisation', 'Updated')

      // Reply
      if (req.body.replyTo) {
        let originalMessage = await Message.findOneAndUpdate({ _id: req.body.replyTo }, { $push: { _replies: message.id } })
        return res.json({ message: message, originalMessage: originalMessage })
      }
      return res.json({ message: message })
    }
  )

  // Like message
  app.post('/v1/message/like',
    async (req, res) => {
      let message = await Message.findOne({ _id: req.body.target })
      message._likes.push(req.user)
      message = await message.save()
      message = await Message.findOne({ _id: req.body.target })
      // Notify users
      io.to('class').emit('like', message)

      return res.json(message)
    }
  )

  // Get messages for given class between given start and end segments
  app.get('/v1/messages/:class/:start/:end/:summary?',
    async (req, res) => {
      if (req.params.summary) {
        let messages = []
        const segmentCount = parseInt(req.params.end) - parseInt(req.params.start)
        for (let index = 0; index < segmentCount; index++) {
          const currentSegment = parseInt(req.params.start) + index
          let message = await Message.findOne({ class: req.params.class, segment: currentSegment }).sort({ created: -1 })
          const messageCount = await Message.count({ class: req.params.class, segment: currentSegment })
          if (message) {
            message = message.toObject()
            message.total = messageCount
            messages.push(message)
          }
        }
        res.json(messages)
      } else {
        const messages = await Message.find({ $and: [{ class: req.params.class, _parent: { $exists: false } }, { segment: { $gte: req.params.start } }, { segment: { $lte: req.params.end } }] }).limit(100).sort({ created: -1 })
        res.json(messages)
      }
    })

  // Get own messages
  app.get('/v1/user/messages/:class',
    async (req, res) => {
      const messages = await Message.find({ _user: req.user, class: req.params.class }).limit(100).sort({ created: -1 })
      res.json(messages)
    })

  // Get teacher messages
  app.get('/v1/teacher/messages/:class',
    async (req, res) => {
      const classroom = await Classroom.findOne({ _user: req.user, class: req.params.class })
      const messages = await Message.find({ $and: [{ class: req.params.class }, { _user: { $in: classroom._students } }] }).limit(100).sort({ created: -1 })
      res.json(messages)
    })

  // Get admin messages
  app.get('/v1/admin/messages/:class',
    async (req, res) => {
      const messages = await Message.find({ class: req.params.class }).limit(100).sort({ created: -1 })
      res.json(messages)
    })
}
