const Homework = require('../../app/models/homework')
const HomeworkMessage = require('../../app/models/homework-message')

module.exports = function (app, passport, io) {

  // Get homework messages
  app.get('/v1/homework/messages/:target',
    async (req, res) => {
      let messages = await HomeworkMessage.find({ _target: req.params.target })      
      // TODO: Ability to view comments
      messages = messages.map((message) => {
        return Object.assign({ hidden: false }, message.toObject())
      })

      // Return the messages for given homework
      return res.json(messages)
    }
  )

  // Post message on homework
  app.post('/v1/homework/message',
    async (req, res) => {
      const data = {
        _user: req.user,
        _target: req.body.target,
        text: req.body.text
      }

      let message = new HomeworkMessage(data)
      message = await message.save()

      // Notify users
      io.to('class').emit('homeworkmessage', message)

      // Return the message
      return res.json(message)
    }
  )

  // Get homework
  app.get('/v1/homework/:id?',
    async (req, res) => {
      if (req.params.id) {
        const homework = await Homework.findOne({ _id: req.params.id })
        res.json(homework)
      } else {
        const homeworks = await Homework.find({})
        res.json(homeworks)
      }
    }
  )

  // Create homework
  app.post('/v1/homework',
    async (req, res) => {
      const data = {
        _user: req.user,
        course: req.instance,
        class: req.body.class,
        content: req.body.content,
        url: req.body.url,
        description: req.body.description
      }

      let homework = new Homework(data)
      homework = await homework.save()

      // Notify users
      io.to('class').emit('homework', homework)

      // Return homework
      return res.json(homework)
    }
  )
}
