export function initCustomDatalist(options, inputId, listId) {
    const input = document.getElementById(inputId);
    const optionsList = document.getElementById(listId);

    if (!input || !optionsList) return;

    // Function to render the list
    function showOptions(filter = '') {
        optionsList.innerHTML = '';
        const filtered = options.filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length > 0) {
            optionsList.style.display = 'block';
            filtered.forEach(opt => {
                const li = document.createElement('li');
                li.textContent = opt;
                li.addEventListener('click', () => {
                    input.value = opt;
                    optionsList.style.display = 'none';
                });
                optionsList.appendChild(li);
            });
        } else {
            optionsList.style.display = 'none';
        }
    }

    // Show on focus (first click)
    input.addEventListener('focus', () => {
        showOptions(); // show all options initially
    });

    // Filter as user types
    input.addEventListener('input', () => {
        showOptions(input.value);
    });

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-datalist')) {
            optionsList.style.display = 'none';
        }
    });
}