const express = require('express')
const app = express()
const router = express.Router()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const jsonParser = bodyParser.json()
const Location = require('../models/location-model')
mongoose.Promise = global.Promise

// ----- GET Requests ----- //

// Get All Locations //
router.get('/', jsonParser, (req, res) => {
  Location.find({})
    .collation({ locale: 'en_US', strength: 1 })
    .sort({ location: 1 })
    .then(locations => {
      res.json(locations.map(location => location.serialize()))
    })
    .catch(err => {
      res.status(500).json({ error: `Server Error ${err}` })
    })
})

// Get Locations by Query //
router.get('/search', jsonParser, (req, res) => {
  Location.find({ $text: { $search: req.query.searchTerm } })
    .sort({ location: 1 })
    .then(locations => {
      res.json(locations.map(location => location.serialize()))
    })
    .catch(err => {
      res.status(500).json({ error: `Server Error ${err}` })
    })
})

// Location by ID //
router.get('/id/:id', (req, res) => {
  Location.findById(req.params.id)
    .then(location => {
      res.json(location.serialize())
    })
    .catch(err => {
      res.status(500).json({ error: 'Server Error Get ID' })
    })
})

// Location by Geography//
router.get('/geography', (req, res) => {
  Location.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat)],
        },
        // Field that will be returned with distance from queried location
        distanceField: 'distance',
        // Specifies indexed field to look in order to calculate distance
        key: 'loc',
        // Equivalent to 50 miles
        maxDistance: 80467.2,
        // Necessary since our model uses a 2dsphere
        spherical: true,
      },
    },
    { $limit: 50 }
  ])
    .then(locations => {
      res.json(locations)
    })
    .catch(err => {
      res.status(500).json({ error: `${err}` })
    })
})

// ----- POST Requests ----- //
router.post('/', jsonParser, (req, res) => {
  // Don't process without a body
  if (req.body.location == '') {
    res.status(400).json({ error: 'No location added' })
  }
  // Check to see if this location exists in database - checking by name AND zip
  // This accounts for multiple locations of same business
  Location.find({ name: req.body.name }, { zip: req.body.zip })
    // We only need to find one to throw the error
    .limit(1)
    .then(results => {
      // If it doesn't exist, we can create a new document based on our body
      if (results.length === 0) {
        Location.create(req.body)
          // Send back new location in response
          .then(location => res.status(201).json(location.serialize()))
          // Catch error in creating new location
          .catch(err => {
            res.status(500).json({ error: `${err}` })
          })
      } else {
        // Throw error if duplicate location exists
        throw new Error('This location already exists.')
      }
    })
    // Catch the error we just threw
    .catch(err => {
      res.status(500).json({ message: `${err}` })
    })
})

// ----- PUT Requests ----- //
router.put('/:id', jsonParser, (req, res) => {
  if (!(req.params.id && req.body.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match',
    })
  }

  Location.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(update => res.status(201).json({ message: 'update succeded' }))
    .catch(err => {
      console.error(err)
      res.status(500).json({ message: 'something went wrong' })
    })
})

// ----- DELETE Requests -----//
router.delete('/:id', (req, res) => {
  Location.findByIdAndRemove(req.params.id)
    .then(update => res.status(201).json({ message: 'location deleted' }))
    .catch(err => res.status(500).json({ message: 'something went wrong' }))
})

module.exports = router
