import { capitalizeWords, formatDate } from "../utils/utils.js";

export async function fetchDr(searchQuery = "") {
    try {
        // const items = await window.electronAPI.fetchPr();

        const items = await window.electronAPI.fetchPrDr({
            tableName: "requestDelivered",
            orderBy: "deliveredDate",
            order: "desc"
        });

        const table = document.getElementById("drTable");
        const tableHead = document.getElementById("drTableHead");
        const tableBody = document.getElementById("drTableBody");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = formatDate(item.deliveredDate);

            const dateMatch = itemDate.includes(searchQuery);
            return itemCodeMatch || dateMatch;
        });

        if (filteredItems.length === 0) {
            table.classList.remove("table-hover");
            tableHead.style.display = "none";
            tableBody.innerHTML = `
                <tr>
                <td colspan="9" class="text-center text-muted p-3 pt-4"><h6>No item found</h6></td>
                </tr>
            `;
            return;
        }

        tableHead.style.display = "table-header-group";

        filteredItems.forEach((item, index) => {
            const row = document.createElement("tr");

            const formattedDate = formatDate(item.deliveredDate);

            row.innerHTML = `
                <td class="checkboxCell" style="display: none;">
                    <input id="checkbox" type="checkbox" class="rowCheckbox" data-id="${item.id}">
                </td>
                <td>${index + 1}</td>
                <td>${item.item.itemCode}</td>
                <td>${item.item.itemName}</td>
                <td>${item.deliveredQuantity}</td>
                <td>${item.item.unit}</td>
                <td>${item.deliveredBy}</td>
                <td>${item.receivedBy}</td>
                <td>${formattedDate}</td>
                <td class=actions">
                    <i data-delete-id="${item.id}" class="dlt-icon icon-btn icon material-icons" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Delete">delete</i>
                    <i data-edit-id="${item.id}" class="edit-icon icon-btn icon material-icons" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Edit">edit</i>
                </td>
            `;
            tableBody.appendChild(row);
        });
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) tooltipInstance.dispose();
        });

        const tooltip = await import("../utils/tooltipUtil.js")
        tooltip.initializeTooltip();
    } catch (error) {
        console.error("Error fetching items:", error);
    }
};