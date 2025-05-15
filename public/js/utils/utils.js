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

export function capitalizeWords(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function formatDate(dateString, timeZone = "Asia/Manila") {
    if (!dateString) return "";
    return new Date(dateString)
        .toLocaleString("en-US", {
            timeZone,
            year: "2-digit",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hourCycle: "h12",
        })
        .replace("AM", "am")
        .replace("PM", "pm")
        .replace(/\//g, "-")
        .replace(",", " --");
}