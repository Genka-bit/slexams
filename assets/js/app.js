// ======================================
// SLExam Pro v5.0
// Part 1 - Common Functions
// ======================================

// URL Parameters
const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const stream = params.get("stream");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");

// Database Cache
let paperData = null;

// -----------------------------
// Load Grade Database
// -----------------------------
async function loadData() {

    if (!grade) return null;

    if (paperData) return paperData;

    const response = await fetch(`assets/data/grade${grade}.json`);

    if (!response.ok) {
        throw new Error(`Cannot load grade${grade}.json`);
    }

    paperData = await response.json();

    return paperData;
}

// -----------------------------
// Create Card
// -----------------------------
function createCard(title, link) {

    const a = document.createElement("a");

    a.className = "grade-card";
    a.href = link;
    a.textContent = title;

    return a;
}

// -----------------------------
// Empty Message
// -----------------------------
function showEmpty(container, message) {

    container.innerHTML = `
        <div style="
            width:100%;
            text-align:center;
            padding:40px;
            color:#666;
            font-size:18px;">
            ${message}
        </div>
    `;
}

// -----------------------------
// URL Encode
// -----------------------------
function url(value) {

    return encodeURIComponent(value || "");

}
// ======================================
// Part 2 - Grade Page + Stream Page
// ======================================

// -----------------------------
// Grade Page
// -----------------------------
async function loadGradePage() {

    const title = document.getElementById("gradeTitle");
    const container = document.getElementById("subjectContainer");

    if (!title || !container) return;

    const g = await loadData();

    if (!g) {

        showEmpty(container, "Grade Not Found");

        return;

    }

    title.textContent = "Grade " + grade;

    container.innerHTML = "";

    // Grade 12 & 13
    if (g.streams) {

        g.streams.forEach(streamName => {

            container.appendChild(

                createCard(

                    streamName,

                    `stream.html?grade=${grade}&stream=${url(streamName)}`

                )

            );

        });

        return;

    }

    // Grade 1 - 11
    if (g.subjects) {

        Object.keys(g.subjects).forEach(subjectName => {

            container.appendChild(

                createCard(

                    subjectName,

                    `subject.html?grade=${grade}&subject=${url(subjectName)}`

                )

            );

        });

    }

}

// -----------------------------
// Stream Page
// -----------------------------
async function loadStreamPage() {

    const title = document.getElementById("streamGradeTitle");
    const container = document.getElementById("streamContainer");

    if (!title || !container) return;

    const g = await loadData();

    if (!g || !g.streamSubjects) {

        showEmpty(container, "No Streams Found");

        return;

    }

    title.textContent = `Grade ${grade} - ${stream}`;

    container.innerHTML = "";

    const subjects = g.streamSubjects[stream];

    if (!subjects) {

        showEmpty(container, "No Subjects Found");

        return;

    }

    Object.keys(subjects).forEach(subjectName => {

        container.appendChild(

            createCard(

                subjectName,

                `subject.html?grade=${grade}&stream=${url(stream)}&subject=${url(subjectName)}`

            )

        );

    });

}
// ======================================
// Part 3 - Subject Page + Term Page
// ======================================

// -----------------------------
// Subject Page
// -----------------------------
function loadSubjectPage() {

    const title = document.getElementById("subjectTitle");

    if (!title) return;

    title.textContent = subject;

    document.getElementById("term1").href =
        `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=1`;

    document.getElementById("term2").href =
        `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=2`;

    document.getElementById("term3").href =
        `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=3`;

}

// -----------------------------
// Term Page
// -----------------------------
async function loadTermPage() {

    const title = document.getElementById("termTitle");
    const container = document.getElementById("paperContainer");

    if (!title || !container) return;

    title.textContent = `${subject} - Term ${term}`;

    container.innerHTML = "";

    const g = await loadData();

    if (!g) {

        showEmpty(container, "Grade Not Found");

        return;

    }

    let papers = [];

    // Grade 1–11
    if (g.subjects) {

        papers = g.subjects?.[subject]?.[term] || [];

    }

    // Grade 12–13
    if (g.streamSubjects) {

        papers =
            g.streamSubjects?.[stream]?.[subject]?.[term] || [];

    }

    if (papers.length === 0) {

        showEmpty(container, "No Papers Available");

        return;

    }

    papers.forEach((item, index) => {

        container.appendChild(

            createCard(

                item.title,

                `paper.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=${term}&paper=${index}`

            )

        );

    });

}
// ======================================
// Part 4 - Paper Page (PDF Viewer)
// ======================================

async function loadPaperPage() {

    const frame = document.getElementById("pdfFrame");
    const download = document.getElementById("downloadBtn");
    const title = document.getElementById("paperTitle");

    if (!frame || !download || !title) return;

    const g = await loadData();

    if (!g) {

        title.textContent = "Grade Not Found";

        return;

    }

    let papers = [];

    // Grade 1 - 11
    if (g.subjects) {

        papers = g.subjects?.[subject]?.[term] || [];

    }

    // Grade 12 - 13
    if (g.streamSubjects) {

        papers = g.streamSubjects?.[stream]?.[subject]?.[term] || [];

    }

    const paperIndex = parseInt(paper, 10);

    if (
        Number.isNaN(paperIndex) ||
        paperIndex < 0 ||
        paperIndex >= papers.length
    ) {

        title.textContent = "Paper Not Found";

        frame.style.display = "none";
        download.style.display = "none";

        return;

    }

    const selectedPaper = papers[paperIndex];

    title.textContent = selectedPaper.title;

    frame.src = selectedPaper.pdf;

    download.href = selectedPaper.pdf;

    download.download =
        selectedPaper.title + ".pdf";

}
// ======================================
// Part 5 - Search + Slider + Dark Mode + Mobile Menu
// ======================================

// -----------------------------
// Search
// -----------------------------
function initializeSearch() {

    const input = document.getElementById("searchInput");
    const button = document.getElementById("searchBtn");

    if (!input || !button) return;

    input.addEventListener("keypress", (e) => {

        if (e.key === "Enter") {
            button.click();
        }

    });

    button.addEventListener("click", () => {

        const value = input.value.trim().toLowerCase();

        if (value === "") return;

        // Grade Search
        const match = value.match(/\d+/);

        if (match) {

            const g = parseInt(match[0]);

            if (g >= 1 && g <= 13) {

                window.location.href = `grade.html?grade=${g}`;
                return;

            }

        }

        // Subject Search
        const subjects = {

            "தமிழ்": 1,
            "கணிதம்": 1,
            "சுற்றாடல்": 1,
            "ஆங்கிலம்": 1,

            "விஞ்ஞானம்": 6,
            "science": 6,
            "ict": 6,
            "history": 6,
            "வரலாறு": 6,

            "physics": 12,
            "chemistry": 12,
            "biology": 12,
            "combined mathematics": 12

        };

        if (subjects[value]) {

            window.location.href =
                `grade.html?grade=${subjects[value]}`;

            return;

        }

        alert("No matching Grade or Subject found.");

    });

}

// -----------------------------
// Auto Slider
// -----------------------------
function initializeSlider() {

    const slides = document.querySelectorAll(".slide");

    if (slides.length === 0) return;

    let current = 0;

    setInterval(() => {

        slides[current].classList.remove("active");

        current = (current + 1) % slides.length;

        slides[current].classList.add("active");

    }, 4000);

}

// -----------------------------
// Dark Mode
// -----------------------------
function initializeDarkMode() {

    const btn = document.getElementById("darkModeBtn");

    if (!btn) return;

    if (localStorage.getItem("theme") === "dark") {

        document.body.classList.add("dark-mode");

        btn.textContent = "☀️";

    }

    btn.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {

            localStorage.setItem("theme", "dark");
            btn.textContent = "☀️";

        } else {

            localStorage.setItem("theme", "light");
            btn.textContent = "🌙";

        }

    });

}

// -----------------------------
// Mobile Menu
// -----------------------------
function initializeMenu() {

    const menu = document.getElementById("menuBtn");
    const nav = document.querySelector(".navbar");

    if (!menu || !nav) return;

    menu.addEventListener("click", () => {

        nav.classList.toggle("active");

    });

}
// ======================================
// Part 6 - Initialize + Error Handler
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    // Grade Page
    if (document.getElementById("subjectContainer")) {
        loadGradePage();
    }

    // Stream Page
    if (document.getElementById("streamContainer")) {
        loadStreamPage();
    }

    // Subject Page
    if (document.getElementById("subjectTitle")) {
        loadSubjectPage();
    }

    // Term Page
    if (document.getElementById("paperContainer")) {
        loadTermPage();
    }

    // Paper Page
    if (document.getElementById("pdfFrame")) {
        loadPaperPage();
    }

    // Common Features
    initializeSearch();
    initializeSlider();
    initializeDarkMode();
    initializeMenu();

});

// ======================================
// Global Error Handler
// ======================================

window.addEventListener("error", (event) => {

    console.error("SLExam Pro Error:", event.error);

});
