export function hideTooltips(...filterIds) {
    filterIds.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener("change", () => {
                const tooltipInstance = bootstrap.Tooltip.getInstance(filterElement);
                if (tooltipInstance) {
                    tooltipInstance.hide();
                }
            });
        }
    });
}