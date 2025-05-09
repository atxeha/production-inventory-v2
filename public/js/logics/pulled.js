function capitalizeWords(str) {
    return str
        .toLowerCase() // Convert entire string to lowercase first
        .split(" ") // Split into words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(" "); // Join words back into a string
}

export async function fetchPulledItems(searchQuery = "") {
    try {
        const items = await window.electronAPI.getPullItems();

        const tableBody = document.getElementById("pulledTableBody");
        const tableHead = document.getElementById("pulledTableHead");
        const pulledTable = document.getElementById("pulledTable");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = new Date(item.releasedDate)
                .toLocaleString("en-US", {
                    timeZone: "Asia/Manila",
                    year: "2-digit",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hourCycle: "h12",
                })
                .replace("AM", "am")
                .replace("PM", "pm")
                .replace("/", "-")
                .replace("/", "-")
                .replace(",", " --");

            const dateMatch = itemDate.includes(searchQuery);
            return itemCodeMatch || dateMatch;
        });

        if (filteredItems.length === 0) {
            pulledTable.classList.remove("table-hover");
            tableHead.style.display = "none";
            tableBody.innerHTML = `
                <tr>
                <td colspan="9" class="text-center text-muted p-3 pt-4"><h6>No item found</h6></td>
                </tr>
            `;
            return;
        }

        filteredItems.forEach((item, index) => {
            const row = document.createElement("tr");

            const formattedDate = new Date(item.releasedDate)
                .toLocaleString("en-US", {
                    timeZone: "Asia/Manila",
                    year: "2-digit",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hourCycle: "h12",
                })
                .replace("AM", "am")
                .replace("PM", "pm")
                .replace("/", "-")
                .replace("/", "-")
                .replace(",", " --");

            row.innerHTML = `
                <td class="checkboxCell" style="display: none;">
                    <input id="checkbox" type="checkbox" class="rowCheckbox" data-id="${item.id}">
                </td>
                <td>${index + 1}</td>
                <td>${item.item.itemCode}</td>
                <td>${item.item.itemName}</td>
                <td>${item.releasedQuantity}</td>
                <td>${item.item.unit}</td>
                <td>${item.releasedBy}</td>
                <td>${item.receivedBy}</td>
                <td>${formattedDate}</td>
                <td>
                    <i class="edit-icon icon-btn icon material-icons ms-3" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Edit">edit</i>
                </td>
            `;
            tableBody.appendChild(row);
        });
        var tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );

        const tooltip = await import("../utils/hideTooltip.js")

        tooltip.hideTooltips("prFilter", "drFilter");
    } catch (error) {
        console.error("Error fetching items:", error);
    }
};