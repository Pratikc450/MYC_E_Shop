const express = require('express');
const indexRouter = express.Router();
const salesController = require('../Controller/sales_controller')
const stockController= require('../Controller/stock_controller')
const stockMovement=require('../Controller/stockMovement_controller')

indexRouter.get('/', salesController.getAllSales);
indexRouter.get('/:saleId', salesController.getSaleById);
indexRouter.post('/', salesController.createSale);

indexRouter.get('/', stockController.getAllStock);
indexRouter.put('/', stockController.updateStock);
indexRouter.get('/:item_id', stockController.getStockById);

indexRouter.get('/', stockMovement.getAllStockMovements);
indexRouter.post('/', stockMovement.recordStockMovement);
indexRouter.get('/:movement_id', stockMovement.getStockMovementById);
module.exports=indexRouter ;
