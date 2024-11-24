import express from "express";

const brandInventoryRoute = express.Router();

brandInventoryRoute.get('/',);
brandInventoryRoute.get('/:brandId',);
brandInventoryRoute.post('/addBrand',);
brandInventoryRoute.put('/:brandId',);
brandInventoryRoute.delete('/:brandId',);
export default brandInventoryRoute;