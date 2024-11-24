import itemInventoryRepository from "../repository/itemInventoryRepository.js";

const addItem = async ( item_code,item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, created_at, updated_at) => {
    return await itemInventoryRepository.addItem(item_code,item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, created_at, updated_at);
}
const getAllItems = async () => {
    return await itemInventoryRepository.getAllItems();
}
const getItemInventory = async (item_id) => {
    return await itemInventoryRepository.getItemById(item_id);
}
const deleteItem = async (item_id) => {
    return await itemInventoryRepository.deleteItem(item_id);
}
const updateItem = async ( item_id, item_code, item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, updated_at) => {
    return await itemInventoryRepository.updateItem(item_id, item_code, item_name, description, price, stock_quantity, status, size_id, brand_id, color_id, updated_at);
}

export default {
    addItem,
    getAllItems,
    getItemInventory,
    deleteItem,
    updateItem,
};