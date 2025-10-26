const Movie = require('../../models/Movieschema'); 
const Event = require('../../models/Event'); 

// Movie autocomplete
const movieAutocomplete = async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const results = await Movie.find({
      movieName: { $regex: searchTerm, $options: 'i' },
    }).limit(10);

    res.json(results); // send array of movie objects
  } catch (error) {
    console.error('Error in movie autocomplete:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Event autocomplete
const eventAutocomplete = async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const results = await Event.find({
      eventName: { $regex: searchTerm, $options: 'i' },
    }).limit(10);

    res.json(results); // send array of event objects
  } catch (error) {
    console.error('Error in event autocomplete:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { movieAutocomplete, eventAutocomplete };
