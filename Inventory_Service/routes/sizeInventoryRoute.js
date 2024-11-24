import express from "express";

const sizeInventoryRoute = express.Router();

sizeInventoryRoute.get('/',);
sizeInventoryRoute.get('/:sizeId',);
sizeInventoryRoute.post('/addSize',);
sizeInventoryRoute.put('/:sizeId',);
sizeInventoryRoute.delete('/:sizeId',);
export default sizeInventoryRoute;