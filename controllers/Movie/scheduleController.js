const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const IST = 'Asia/Kolkata';

const Product1 = require('../../models/Movieschema') // movie model
const Product2 = require('../../models/Scheduleschema') // schedule model

// Helper: normalize shows to expected shape
// Accepts either already-correct structures or raw input from frontend.
function normalizeShows(shows = []) {
    return (shows || []).map(s => {
      // If time is array of strings + top-level prices → expand to per-time objects
      if (Array.isArray(s.time) && s.time.every(t => typeof t === 'string')) {
        const { RoyalTicketPrice, ClubTicketPrice, ExecutiveTicketPrice } = s;
        return {
          hallName: s.hallName,
          time: s.time.map(at => ({
            at,
            RoyalTicketPrice,
            ClubTicketPrice,
            ExecutiveTicketPrice,
          })),
        };
      }
      // If already array of { at, ...prices }
      if (Array.isArray(s.time) && s.time.every(t => typeof t === 'object' && t?.at)) {
        return {
          hallName: s.hallName,
          time: s.time.map(t => ({
            at: t.at,
            RoyalTicketPrice: t.RoyalTicketPrice,
            ClubTicketPrice: t.ClubTicketPrice,
            ExecutiveTicketPrice: t.ExecutiveTicketPrice,
          })),
        };
      }
      // Fallback: single string
      if (typeof s.time === 'string') {
        return {
          hallName: s.hallName,
          time: [{
            at: s.time,
            RoyalTicketPrice: s.RoyalTicketPrice,
            ClubTicketPrice: s.ClubTicketPrice,
            ExecutiveTicketPrice: s.ExecutiveTicketPrice,
          }],
        };
      }
      return { hallName: s.hallName, time: [] };
    });
  }

const scheduleProduct = async (req, res, next) => {
  try {
    const schedule = new Product2({
      Movie: req.body.Movie,   // ObjectId
      shows: normalizeShows(req.body.shows)
    });

    const result = await schedule.save();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Creating schedule failed' });
  }
};

const getscheduleProducts = async (req, res, next) => {
  try {
    const products = await Product2.find().populate('Movie').exec();
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedules failed' });
  }
};

const getScheduleProductById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product2.findById(id).populate('Movie').exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Find schedules by movie name and expand showtimes in IST window
const getScheduleProductByMovieName = async (req, res) => {
  const movieName = req.params.pid;

  try {
    const movie = await Product1
      .findOne({ movieName: { $regex: new RegExp(movieName, 'i') } })
      .exec();

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const schedules = await Product2.find({ Movie: movie._id }).lean().exec();
    if (!schedules.length) {
      return res.status(404).json({ message: 'No schedules found for this movie' });
    }

    const nowIST = dayjs().tz(IST);
    const windowStart = nowIST.subtract(50, 'minute');
    const windowEnd = nowIST.add(3, 'day').endOf('day');
    const dayStarts = [0,1,2,3].map(d => nowIST.startOf('day').add(d, 'day'));

    const isHHMM = (s) => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
    const expanded = [];

    for (const sch of schedules) {
      const shows = Array.isArray(sch.shows) ? sch.shows : [];
      for (const show of shows) {
        const hall = show?.hallName || 'Unknown Hall';
        const times = Array.isArray(show?.time) ? show.time : [];

        for (const slot of times) {
          const raw = (slot && typeof slot === 'object') ? slot.at : (typeof slot === 'string' ? slot : null);
          if (!isHHMM(raw)) {
            if (raw != null) console.warn('Skipping invalid time format:', raw, 'for hall:', hall);
            continue;
          }
          const [h, m] = raw.split(':').map(Number);
          if (Number.isNaN(h) || Number.isNaN(m)) continue;

          for (const day of dayStarts) {
            const startAt = day.hour(h).minute(m).second(0).millisecond(0);
            if (startAt.isBefore(windowStart) || startAt.isAfter(windowEnd)) continue;

            expanded.push({
              Movie: movie._id,
              hallName: hall,
              time: raw,
              startAt: startAt.toDate(),
              startAtISO: startAt.toISOString(),
              RoyalTicketPrice: Number.isFinite(slot?.RoyalTicketPrice) ? slot.RoyalTicketPrice : undefined,
              ClubTicketPrice: Number.isFinite(slot?.ClubTicketPrice) ? slot.ClubTicketPrice : undefined,
              ExecutiveTicketPrice: Number.isFinite(slot?.ExecutiveTicketPrice) ? slot.ExecutiveTicketPrice : undefined,
            });
          }
        }
      }
    }

    expanded.sort((a,b) => new Date(a.startAt) - new Date(b.startAt));

    if (!expanded.length) {
      return res.status(404).json({ message: 'No bookable showtimes for this movie' });
    }

    res.json(expanded);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

const updateScheduleProductById = async (req, res, next) => {
  const id = req.params.pid;
  const updateData = {
    Movie: req.body.Movie,
    shows: normalizeShows(req.body.shows)
  };

  try {
    const product = await Product2
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('Movie')
      .exec();

    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Updating schedule failed' });
  }
};

const deleteScheduleProducById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product2.findByIdAndDelete(id).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Deleting schedule failed' });
  }
};

// escape regex for exact-ish match
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getShowsByMovieAndHall = async (req, res, next) => {
  const { movieName, hallName } = req.params;

  try {
    const movie = await Product1
      .findOne({ movieName: { $regex: new RegExp(movieName, 'i') } })
      .exec();

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const scheduleRows = await Product2.aggregate([
      { $match: { Movie: movie._id } },
      { $unwind: '$shows' },
      { $match: { 'shows.hallName': { $regex: new RegExp(`^${escapeRegex(hallName)}$`, 'i') } } },
      { $unwind: '$shows.time' },
      {
        $project: {
          _id: 0,
          hallName: '$shows.hallName',
          time: '$shows.time.at',
          RoyalTicketPrice: '$shows.time.RoyalTicketPrice',
          ClubTicketPrice: '$shows.time.ClubTicketPrice',
          ExecutiveTicketPrice: '$shows.time.ExecutiveTicketPrice',
        }
      }
    ]).exec();

    if (!scheduleRows.length) {
      return res.status(404).json({ message: 'No shows found for that movie and hall' });
    }

    const nowIST = dayjs().tz(IST);
    const windowStart = nowIST.subtract(50, 'minute');
    const windowEnd = nowIST.add(3, 'day');
    const dayStarts = [0,1,2,3].map(d => nowIST.startOf('day').add(d, 'day'));

    const expanded = [];
    for (const row of scheduleRows) {
      if (!row.time || typeof row.time !== 'string') continue;
      const [h,m] = row.time.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      for (const day of dayStarts) {
        const startAt = day.hour(h).minute(m).second(0).millisecond(0);
        if (startAt.isAfter(windowStart) && startAt.isBefore(windowEnd)) {
          expanded.push({
            Movie: movie._id,
            hallName: row.hallName,
            time: row.time,
            startAt: startAt.toDate(),
            startAtISO: startAt.toISOString(),
            RoyalTicketPrice: row.RoyalTicketPrice,
            ClubTicketPrice: row.ClubTicketPrice,
            ExecutiveTicketPrice: row.ExecutiveTicketPrice,
          });
        }
      }
    }

    expanded.sort((a,b) => a.startAt - b.startAt);

    if (!expanded.length) {
      return res.status(404).json({ message: 'No bookable showtimes for this movie and hall' });
    }

    res.json(expanded);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching shows failed' });
  }
};

module.exports = {scheduleProduct, getscheduleProducts, getScheduleProductById, getScheduleProductByMovieName, updateScheduleProductById, deleteScheduleProducById, getShowsByMovieAndHall};
