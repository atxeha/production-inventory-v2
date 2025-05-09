document.addEventListener("DOMContentLoaded", async () => {

    function backToHome() {
        const back = document.getElementById("backBtn");
        if (back) {
            back.removeEventListener("click", back._listener);
            back._listener = (e) => {
                e.preventDefault();
                loadPage("home.html");
            };
            back.addEventListener("click", back._listener);
        }
    }

    async function initNavigationListeners() {
        const viewPulledItem = document.getElementById("viewPulledItem");
        const viewRequest = document.getElementById("viewRequest");

        if (viewPulledItem) {
            viewPulledItem.addEventListener("click", async (e) => {
                e.preventDefault();
                console.log("clicked")
                await loadPage("pulled.html");
            });
        }

        if (viewRequest) {
            viewRequest.addEventListener("click", async (e) => {
                e.preventDefault();
                console.log("clicked")
                await loadPage("prDr.html");
            });
        }

        backToHome();
    }

    await loadPage("home.html");
    await initNavigationListeners();


    function attachScrollListener() {
        const tableContainer = document.querySelector(".table-container");
        const tableHead = document.querySelector(".table thead");

        if (tableContainer && tableHead) {
            tableContainer.addEventListener("scroll", function () {
                tableContainer.classList.add("scrolling");

                clearTimeout(tableContainer.scrollTimeout);
                tableContainer.scrollTimeout = setTimeout(() => {
                    tableContainer.classList.remove("scrolling");
                }, 400);

                if (tableContainer.scrollTop > 0) {
                    tableHead.style.boxShadow = "0 8px 12px rgba(0, 0, 0, 0.1)";
                } else {
                    tableHead.style.boxShadow = "none";
                }
            });
        }
    }

    function initializeTooltips() {
        // Remove all existing tooltip DOM elements
        document.querySelectorAll('.tooltip').forEach(t => t.remove());

        var tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );

        // Dispose existing tooltips to avoid duplicates
        tooltipTriggerList.forEach((el) => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });

        tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );
    }

    async function loadPage(page) {
        await fetch(`./${page}`)
            .then((response) => response.text())
            .then(async (data) => {
                // Parse the fetched HTML string to extract only the content inside the body tag
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const bodyContent = doc.body.innerHTML;

                document.getElementById("main-content").innerHTML = bodyContent;
                initializeTooltips();

                // localStorage.setItem("currentPage", page);

                // Attach scroll listener after content load
                attachScrollListener();

                await initNavigationListeners(page);

                if (page === "home.html") {
                    const homeModule = await import("./js/logics/home.js");
                    const utilsModule = await import("./js/utils/defaultDate.js");

                    const options = ["Bottle", "Box", "Bundle", "Piece", "Ream", "Roll", "Set", ];

                    const searchItem = document.getElementById("searchItem");
                    let searchFilter = "";
                    if (searchItem) {
                        const savedFilter = localStorage.getItem("searchItem");
                        if (savedFilter) {
                            searchFilter = savedFilter;
                            searchItem.value = savedFilter;
                        } else {
                            searchItem.value = searchFilter;
                        }
                    } 
                    
                    homeModule.initAddItem();
                    homeModule.initModalListeners();
                    homeModule.initCustomDatalist(options, 'addUnit', 'addUnits');
                    homeModule.fetchItems(searchFilter)
                    homeModule.displayLogs()

                    homeModule.initPullItem();


                    utilsModule.initDate("addDate", "pullDate", "newQuantityDate")

                    if (searchItem) {
                        searchItem.addEventListener("input", () => {
                            localStorage.setItem("searchItem", searchItem.value);
                            homeModule.fetchItems(searchItem.value);
                        });
                    }
                }

                if (page === "pulled.html") {
                    const pulledModule = await import("./js/logics/pulled.js");
                    // const utilsModule = await import("./js/utils/defaultDate.js");

                    // const options = ["Bottle", "Box", "Bundle", "Piece", "Ream", "Roll", "Set", ];

                    const searchItem = document.getElementById("searchItem");
                    let searchFilter = "";
                    if (searchItem) {
                        const savedFilter = localStorage.getItem("searchItem");
                        if (savedFilter) {
                            searchFilter = savedFilter;
                            searchItem.value = savedFilter;
                        } else {
                            searchItem.value = searchFilter;
                        }
                    } 
                    
                    // pulledModule.initAddItem();
                    // pulledModule.initModalListeners();
                    // pulledModule.initCustomDatalist(options, 'addUnit', 'addUnits');
                    pulledModule.fetchPulledItems(searchFilter)
                    // pulledModule.displayLogs()


                    // utilsModule.initDate("addDate", "pullDate", "newQuantityDate")

                    if (searchItem) {
                        searchItem.addEventListener("input", () => {
                            localStorage.setItem("searchItem", searchItem.value);
                            pulledModule.fetchItems(searchItem.value);
                        });
                    }
                }


            })
            .catch((error) => console.error("Error loading page:", error));
    }

    window.electronAPI.onLoadPage(async (event, page) => {
        console.log("Received load-page event for:", page);
        await loadPage(page);
    });

    // const currentPage = localStorage.getItem("currentPage");
    // if (currentPage) {
    //     await loadPage(currentPage);
    // } else {
    //     await window.electronAPI.navigate("home.html");
    // }
})
