import express from "express";

const colorInventoryRoute = express.Router();

colorInventoryRoute.get('/',);
colorInventoryRoute.get('/:colorId',);
colorInventoryRoute.post('/addColor',);
colorInventoryRoute.put('/:colorId',);
colorInventoryRoute.delete('/:colorId',);
export default colorInventoryRoute;