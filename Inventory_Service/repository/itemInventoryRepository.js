import db from "../database/db.js";
import client from "../database/redisStorage/redisConnect.js";
import AppError from "../exceptions/AppError.js";

const addItem = async (item_code,item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, created_at, updated_at) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // Check if user with the same email already exists
        const [existingItem] = await conn.execute(
            `SELECT * FROM tbl_item_details WHERE item_code =?`,
            [item_code]
        );
        console.log(existingItem[0]);
        
        if (existingUser[0]) {
            throw new AppError("Item already exists.",401);
        }
        const [result] = await conn.execute(
            'INSERT INTO tbl_item_details (item_code,item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [item_code,item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, created_at, updated_at]
        );
        console.log("Item added successfully!");
        await client.set(`ItemCache:${result.insertId}`, JSON.stringify({
            "ItemName": item_name, 
            "status": status, 
            "supplierId": supplierId, 
            "quantityInStock": stock_quantity, 
            "price": price, 
            "description": description}), {
                EX: 900,
          });
        await conn.commit();
        return result.insertId;
    } catch (error) {
        await conn.rollback();
        console.error("Error adding Item:", error);
        throw new AppError("Error adding Item.",500);
    }
    finally {
        conn.release();
    }
}

export default {
    addItem,
};