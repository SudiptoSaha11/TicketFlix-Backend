// controllers/beverageController.js
const Beverage = require('../../models/Beverageschema'); // adjust path to your model

// Create beverage
exports.createBeverage = async (req, res) => {
  try {
    const { beverageName, image, category, sizes } = req.body;
    // sizes should be an array of { label, price, quantity }
    const beverage = new Beverage({ beverageName, image, category, sizes });
    const saved = await beverage.save();
    return res.status(201).json(saved);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: error.message, errors: error.errors });
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Beverage name must be unique.' });
    }
    console.error('Error creating beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Get all beverages (with optional filters)
exports.getAllBeverages = async (req, res) => {
  try {
    const { category, size } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (size) filter['sizes.label'] = size;

    const beverages = await Beverage.find(filter).sort({ beverageName: 1 });
    return res.status(200).json(beverages);
  } catch (error) {
    console.error('Error fetching beverages:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Get a single beverage by ID
exports.getBeverageById = async (req, res) => {
  try {
    const { id } = req.params;
    const beverage = await Beverage.findById(id);
    if (!beverage) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json(beverage);
  } catch (error) {
    console.error('Error fetching beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Update a beverage (including size quantities)
exports.updateBeverage = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body can contain any of beverageName, image, category, sizes (with quantities)
    const updates = req.body;
    const options = { new: true, runValidators: true };
    const updated = await Beverage.findByIdAndUpdate(id, updates, options);
    if (!updated) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: error.message, errors: error.errors });
    }
    console.error('Error updating beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a beverage
exports.deleteBeverage = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Beverage.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json({ message: 'Beverage deleted successfully' });
  } catch (error) {
    console.error('Error deleting beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};
