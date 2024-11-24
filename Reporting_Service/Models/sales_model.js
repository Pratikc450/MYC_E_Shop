const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
  item_id: { type: Number, required: true },
  quantity_sold: { type: Number, required: true },
  sale_date: { type: Date, default: Date.now },
  total_revenue: { type: mongoose.Types.Decimal128, required: true },
});

module.exports = mongoose.model('Sales', SalesSchema);
