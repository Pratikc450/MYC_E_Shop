const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  item_id: { type: Number, unique: true, required: true },
  quantity_in_stock: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stock', StockSchema);
