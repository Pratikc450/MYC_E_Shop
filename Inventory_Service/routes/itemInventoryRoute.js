import express from "express";

const itemInventoryRoute = express.Router();

itemInventoryRoute.get('/',);
itemInventoryRoute.get('/:itemId',);
itemInventoryRoute.post('/addItem',);
itemInventoryRoute.put('/:itemId',);
itemInventoryRoute.delete('/:itemId',);
itemInventoryRoute.post('/:itemId/images',);
itemInventoryRoute.delete('/:itemId/images/:imagesId',);
export default itemInventoryRoute;