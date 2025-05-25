import { formatDate } from "../utils/utils.js";

export async function fetchPulledItems(searchQuery = "") {
    try {
        const items = await window.electronAPI.getPullItems();

        const tableBody = document.getElementById("pulledTableBody");
        const tableHead = document.getElementById("pulledTableHead");
        const pulledTable = document.getElementById("pulledTable");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = formatDate(item.releasedDate);

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

        tableHead.style.display = "table-header-group";

        filteredItems.forEach((item, index) => {
            const row = document.createElement("tr");

            const formattedDate = formatDate(item.releasedDate);

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
                <td class=actions">
                    <i data-delete-id="${item.id}" class="dlt-icon icon-btn icon material-icons" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Delete">delete</i>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        const tooltip = await import("../utils/tooltipUtil.js")
        tooltip.initializeTooltip();
    } catch (error) {
        return;
    }
};


export function initImportItem(search) {
  const importBtn = document.getElementById("importItem");
  if (
    importBtn &&
    window.electronAPI?.importPulledItemsFromFile &&
    !importBtn._importListenerAdded
  ) {
    importBtn.addEventListener("click", async () => {
      const result = await window.electronAPI.importPulledItemsFromFile();
      if (result && result.success) {
        window.electronAPI.showToast(result.message, true);
        // Optionally refresh your items table here:
        fetchPulledItems(search);
      } else {
        window.electronAPI.showToast(
          result?.message || "Import failed.",
          false
        );
      }
    });
    importBtn._importListenerAdded = true;
  }
}