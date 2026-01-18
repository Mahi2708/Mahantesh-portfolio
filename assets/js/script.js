// Mobile Menu Toggle
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

menuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
});

// Navigation Active State on Scroll
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (scrollY >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });

    // Back to Top Visibility
    const backToTop = document.getElementById("back-to-top");
    if (scrollY > 300) backToTop.classList.remove("hidden");
    else backToTop.classList.add("hidden");
});

// Back to Top
document.getElementById("back-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});
// Highlight section title when section becomes visible
const section = document.querySelectorAll("section");
const options = { threshold: 0.5 };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const title = entry.target.querySelector(".section-title");

        if (title) {
            if (entry.isIntersecting) {
                title.classList.add("active");
            } else {
                title.classList.remove("active");
            }
        }
    });
}, options);

sections.forEach(section => observer.observe(section));

// -------------------------
// FIXED MODAL FUNCTIONS
// -------------------------
function openModal(id) {
    document.getElementById(id + "-modal").classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id + "-modal").classList.add("hidden");
}
   const showMoreCard = document.getElementById("showMoreCard");
    const hiddenProjects = document.querySelectorAll(".hidden-project");

    let expanded = false;

    showMoreCard.addEventListener("click", () => {
        expanded = !expanded;

        hiddenProjects.forEach(project => {
            project.classList.toggle("hidden");
        });

        // Change card text
        showMoreCard.innerHTML = expanded
            ? `
                <div class="p-10 text-center">
                    <div class="text-5xl mb-4 text-primary">
                        <i class="fas fa-minus-circle"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Show Less</h3>
                    <p class="text-slate-400">Click to hide extra projects</p>
                </div>
              `
            : `
                <div class="p-10 text-center">
                    <div class="text-5xl mb-4 text-primary">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Show More</h3>
                    <p class="text-slate-400">Click to view more projects</p>
                </div>
              `;
    });
