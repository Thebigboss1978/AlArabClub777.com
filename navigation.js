// navigation.js

// Random page navigation for all HTML pages in the main folder

const pages = [
    'index.html',
    'about.html',
    'services.html',
    'contact.html',
    'products.html',
    'blog.html'
];

function getRandomPage() {
    const randomIndex = Math.floor(Math.random() * pages.length);
    return pages[randomIndex];
}

function navigateRandomPage() {
    window.location.href = getRandomPage();
}

// Adding an event listener for navigation on button click
const randomNavButton = document.getElementById('random-nav');
if (randomNavButton) {
    randomNavButton.addEventListener('click', navigateRandomPage);
}