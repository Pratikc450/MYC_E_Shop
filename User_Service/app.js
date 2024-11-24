import express from "express";
import userRoute from "./routes/userRoute.js";
import {connectDb} from "./database/db.js"

const app = express();
const port = 3001;

app.use(express.json({extended: true}));
app.use('/users', userRoute)




connectDb()

app.listen(port,() => console.log(`listening on port ${port}`));
