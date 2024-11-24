import express from "express";
import indexInventoryRoute from "./routes/indexInventoryRoute.js";

const app = express();
const port = 3002;

app.use(express.json({extended: true,}));
app.use('/api/inventory', indexInventoryRoute)
app.listen(port,() => console.log(`listening on port ${port}`));
