import express from "express";
import itemInventoryController from "../controller/itemInventoryController.js";

const itemInventoryRoute = express.Router();

itemInventoryRoute.post('/addItem',itemInventoryController.addItem); 
itemInventoryRoute.get('/',itemInventoryController.getAllItems);
itemInventoryRoute.get('/:itemId',itemInventoryController.getItemById);
itemInventoryRoute.put('/:itemId',itemInventoryController.updateItemById);
itemInventoryRoute.delete('/:itemId',itemInventoryController.updateItemById);

//changes needed
itemInventoryRoute.post('/:itemId/images',);
itemInventoryRoute.delete('/:itemId/images/:imagesId',);
export default itemInventoryRoute;