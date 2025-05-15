export async function fetchItems() {
    try {
        const items = await window.electronAPI.getItems();
        const itemCodes = [];

        items.forEach((item) => {
            itemCodes.push(`${item.itemCode} [${item.itemName}]`);
        });

        return itemCodes;

    } catch (error) {
        console.error("Error fetching items:", error);
    }
}