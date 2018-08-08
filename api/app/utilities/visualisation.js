module.exports = function () {
  return {
    format: (vis, duration) => {
      
      let max = Math.max.apply(Math, vis.map(o => o.count))
      let visualisation = {}, groups = {}

      for (let v of vis) {
        const segment = parseInt(v._id)
        let percent = Math.floor((segment / (duration / 5)) * 100)
        let val = parseInt(v.count) / max
        
        if (visualisation[percent]) {
          visualisation[percent] += val
          groups[percent] = groups[percent] ? groups[percent] + 1 : 2
          continue
        }
        visualisation[percent] = val
      }

      for (let key in groups) {
        visualisation[key] = visualisation[key] / groups[key]
      }

      let fill = 0
      while (fill <= 100) {
        visualisation[fill] = visualisation[fill] ? visualisation[fill] : 0
        fill++
      }

      return visualisation
    }
  }
}