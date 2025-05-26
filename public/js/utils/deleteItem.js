/**
 * Dynamic delete handler for any table with delete icons.
 * @param {string} tableBodyId - The tbody element's id.
 * @param {string} tableName - The table/model name for deletion.
 * @param {Function} fetchFn - The function to refresh the table (e.g., fetchPulledItems).
 * @param {string} [search=""] - Optional search/filter string.
 */
export function setupDeleteHandler(
  tableBodyId,
  tableName,
  fetchFn,
  search = ""
) {
  const tableBody = document.getElementById(tableBodyId);
  if (tableBody && !tableBody._deleteListenerAdded) {
    tableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (target.classList.contains("dlt-icon")) {
        event.preventDefault();
        const id = target.dataset.deleteId;
        const res = await window.electronAPI.deleteItemFromAnyTable(
          id,
          tableName
        );
        if (res.success) {
          window.electronAPI.showToast(res.message, true);
          fetchFn(search);
          const tooltip = bootstrap.Tooltip.getInstance(target);
          if (tooltip) {
            tooltip.hide();
          }
        } else {
          window.electronAPI.showToast(res.message, false);
        }
      }
    });
    tableBody._deleteListenerAdded = true;
  }
}
