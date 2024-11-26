import pool from "../config/db.js";

export const getAllWishlistRepo = async (user_id) => {
  const [result] = await pool.query(
    `SELECT * FROM TBL_WISHLIST WHERE user_id = ${user_id}`
  );
  return result[0];
};
