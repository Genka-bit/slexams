// ======================================
// SLExam Pro v5.1
// Final App.js
// ======================================

// ======================================
// Part 1 - URL Parameters + Database
// ======================================

const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const stream = params.get("stream");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");

let paperData = null;


// ======================================
// Load Grade JSON
// ======================================

async function loadData() {

    if (!grade) return null;

    if (paperData) return paperData;

    try {

        const response =
            await fetch(`assets/data/grade${grade}.json`);

        if (!response.ok) {
            throw new Error(
                `Cannot load grade${grade}.json`
            );
        }

        paperData = await response.json();

        return paperData;

    } catch (error) {

        console.error("Database Error:", error);

        return null;

    }

}


// ======================================
// Create Card
// ======================================

function createCard(title, link) {

    const a = document.createElement("a");

    a.className = "grade-card";

    a.href = link;

    a.textContent = title;

    return a;

}


// ======================================
// Empty Message
// ======================================

function showEmpty(container, message) {

    if (!container) return;

    container.innerHTML = `
        <div class="empty-message">
            ${message}
        </div>
    `;

}


// ======================================
// URL Encode
// ======================================

function url(value) {

    return encodeURIComponent(value || "");

}


// ======================================
// Get Papers
// ======================================

function getPapers(data) {

    if (!data) return [];

    // Grade 1–11
    if (data.subjects && subject) {

        return data.subjects?.[subject]?.[term] || [];

    }

    // Grade 12–13
    if (
        data.streamSubjects &&
        stream &&
        subject
    ) {

        return (
            data.streamSubjects
                ?. [stream]
                ?. [subject]
                ?. [term] || []
        );

    }

    return [];

}


// ======================================
// Part 2 - Grade Page
// ======================================

async function loadGradePage() {

    const title =
        document.getElementById("gradeTitle");

    const container =
        document.getElementById("subjectContainer");

    if (!title || !container) return;

    const data = await loadData();

    if (!data) {

        showEmpty(
            container,
            "Unable to load Grade data."
        );

        return;

    }

    title.textContent = "Grade " + grade;

    container.innerHTML = "";


    // ==============================
    // Grade 12–13
    // ==============================

    if (data.streams) {

        data.streams.forEach(streamName => {

            container.appendChild(

                createCard(

                    streamName,

                    `stream.html?grade=${grade}&stream=${url(streamName)}`

                )

            );

        });

        return;

    }


    // ==============================
    // Grade 1–11
    // ==============================

    if (data.subjects) {

        Object.keys(data.subjects)
            .forEach(subjectName => {

                container.appendChild(

                    createCard(

                        subjectName,

                        `subject.html?grade=${grade}&subject=${url(subjectName)}`

                    )

                );

            });

        return;

    }

    showEmpty(
        container,
        "No Subjects Available"
    );

}


// ======================================
// Part 3 - Stream Page
// ======================================

async function loadStreamPage() {

    const title =
        document.getElementById("streamGradeTitle");

    const container =
        document.getElementById("streamContainer");

    if (!title || !container) return;

    const data = await loadData();

    if (
        !data ||
        !data.streamSubjects
    ) {

        showEmpty(
            container,
            "No Streams Found"
        );

        return;

    }

    title.textContent =
        `Grade ${grade} - ${stream}`;

    container.innerHTML = "";


    const subjects =
        data.streamSubjects?.[stream];


    if (!subjects) {

        showEmpty(
            container,
            "No Subjects Found"
        );

        return;

    }


    // IMPORTANT:
    // subjects is an Object,
    // therefore Object.keys() is required.

    Object.keys(subjects)
        .forEach(subjectName => {

            container.appendChild(

                createCard(

                    subjectName,

                    `subject.html?grade=${grade}&stream=${url(stream)}&subject=${url(subjectName)}`

                )

            );

        });

}


// ======================================
// Part 4 - Subject Page
// ======================================

function loadSubjectPage() {

    const title =
        document.getElementById("subjectTitle");

    if (!title) return;

    title.textContent = subject;


    const term1 =
        document.getElementById("term1");

    const term2 =
        document.getElementById("term2");

    const term3 =
        document.getElementById("term3");


    if (term1) {

        term1.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=1`;

    }


    if (term2) {

        term2.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=2`;

    }


    if (term3) {

        term3.href =
            `term.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=3`;

    }

}


// ======================================
// Part 5 - Term Page
// ======================================

async function loadTermPage() {

    const title =
        document.getElementById("termTitle");

    const container =
        document.getElementById("paperContainer");

    if (!title || !container) return;

    title.textContent =
        `${subject} - Term ${term}`;

    container.innerHTML = "";


    const data = await loadData();


    if (!data) {

        showEmpty(
            container,
            "Unable to load Grade data."
        );

        return;

    }


    const papers =
        getPapers(data);


    if (
        !Array.isArray(papers) ||
        papers.length === 0
    ) {

        showEmpty(
            container,
            "No Papers Available"
        );

        return;

    }


    papers.forEach((item, index) => {

        if (!item || !item.title) return;


        container.appendChild(

            createCard(

                item.title,

                `paper.html?grade=${grade}&stream=${url(stream)}&subject=${url(subject)}&term=${term}&paper=${index}`

            )

        );

    });

}


// ======================================
// Part 6 - Paper Page
// ======================================

async function loadPaperPage() {

    const frame =
        document.getElementById("pdfFrame");

    const download =
        document.getElementById("downloadBtn");

    const title =
        document.getElementById("paperTitle");

    if (
        !frame ||
        !download ||
        !title
    ) return;


    const data =
        await loadData();


    if (!data) {

        title.textContent =
            "Grade Not Found";

        return;

    }


    const papers =
        getPapers(data);


    const paperIndex =
        Number.parseInt(paper, 10);


    if (
        Number.isNaN(paperIndex) ||
        paperIndex < 0 ||
        paperIndex >= papers.length
    ) {

        title.textContent =
            "Paper Not Found";

        frame.style.display = "none";

        download.style.display = "none";

        return;

    }


    const selectedPaper =
        papers[paperIndex];


    if (
        !selectedPaper ||
        !selectedPaper.pdf
    ) {

        title.textContent =
            "PDF Not Available";

        frame.style.display = "none";

        download.style.display = "none";

        return;

    }


    // Original paper title
    title.textContent =
        selectedPaper.title;


    // PDF Viewer
    frame.src =
        selectedPaper.pdf;


    // Download
    download.href =
        selectedPaper.pdf;


    // Use original title
    download.download =
        `${selectedPaper.title}.pdf`;

}


// ======================================
// Part 7 - Search
// ======================================

function initializeSearch() {

    const input =
        document.getElementById("searchInput");

    const button =
        document.getElementById("searchBtn");


    if (!input || !button) return;


    input.addEventListener(
        "keypress",
        event => {

            if (event.key === "Enter") {

                button.click();

            }

        }
    );


    button.addEventListener(
        "click",
        () => {

            const value =
                input.value
                    .trim()
                    .toLowerCase();


            if (!value) return;


            // ==============================
            // Grade Search
            // ==============================

            const match =
                value.match(/\d+/);


            if (match) {

                const searchedGrade =
                    Number.parseInt(
                        match[0],
                        10
                    );


                if (
                    searchedGrade >= 1 &&
                    searchedGrade <= 13
                ) {

                    window.location.href =
                        `grade.html?grade=${searchedGrade}`;

                    return;

                }

            }


            // ==============================
            // Subject Search
            // ==============================

            const subjects = {

                "தமிழ்": 1,
                "கணிதம்": 1,
                "சுற்றாடல்": 1,
                "ஆங்கிலம்": 1,
                "இரண்டாம் மொழி": 1,

                "விஞ்ஞானம்": 6,
                "science": 6,
                "வரலாறு": 6,
                "history": 6,
                "புவியியல்": 6,
                "குடியியல்": 6,
                "சுகாதாரம்": 6,
                "சைவசமயம்": 6,
                "கத்தோலிக்கம்": 6,
                "கிறிஸ்தவம்": 6,
                "இஸ்லாம்": 6,
                "அழகியல்": 6,
                "சிங்களம்": 6,
                "ict": 6,
                "pts": 6,

                "வணிகக்கல்வி": 10,
                "விவசாயம்": 10,
                "technology": 10,

                "physics": 12,
                "chemistry": 12,
                "biology": 12,
                "combined mathematics": 12,
                "accounting": 12,
                "economics": 12,
                "business studies": 12

            };


            if (subjects[value]) {

                window.location.href =
                    `grade.html?grade=${subjects[value]}`;

                return;

            }


            alert(
                "No matching Grade or Subject found."
            );

        }
    );

}


// ======================================
// Part 8 - Auto Slider
// ======================================

function initializeSlider() {

    const slides =
        document.querySelectorAll(".slide");


    if (slides.length === 0) return;


    let current = 0;


    slides[current]
        .classList
        .add("active");


    setInterval(() => {

        slides[current]
            .classList
            .remove("active");


        current =
            (current + 1) % slides.length;


        slides[current]
            .classList
            .add("active");

    }, 4000);

}


// ======================================
// Part 9 - Dark Mode
// ======================================

function initializeDarkMode() {

    const btn =
        document.getElementById(
            "darkModeBtn"
        );


    if (!btn) return;


    if (
        localStorage.getItem("theme")
        === "dark"
    ) {

        document.body
            .classList
            .add("dark-mode");

        btn.textContent = "☀️";

    } else {

        btn.textContent = "🌙";

    }


    btn.addEventListener(
        "click",
        () => {

            document.body
                .classList
                .toggle("dark-mode");


            const dark =
                document.body
                    .classList
                    .contains("dark-mode");


            if (dark) {

                localStorage.setItem(
                    "theme",
                    "dark"
                );

                btn.textContent = "☀️";

            } else {

                localStorage.setItem(
                    "theme",
                    "light"
                );

                btn.textContent = "🌙";

            }

        }
    );

}


// ======================================
// Part 10 - Mobile Menu
// ======================================

function initializeMenu() {

    const menu =
        document.getElementById(
            "menuBtn"
        );

    const nav =
        document.querySelector(
            ".navbar"
        );


    if (!menu || !nav) return;


    menu.addEventListener(
        "click",
        () => {

            nav.classList.toggle(
                "active"
            );

        }
    );

}


// ======================================
// Part 11 - Initialize
// ======================================

window.addEventListener(
    "DOMContentLoaded",
    () => {


        // Grade Page

        if (
            document.getElementById(
                "subjectContainer"
            )
        ) {

            loadGradePage();

        }


        // Stream Page

        if (
            document.getElementById(
                "streamContainer"
            )
        ) {

            loadStreamPage();

        }


        // Subject Page

        if (
            document.getElementById(
                "subjectTitle"
            )
        ) {

            loadSubjectPage();

        }


        // Term Page

        if (
            document.getElementById(
                "paperContainer"
            )
        ) {

            loadTermPage();

        }


        // Paper Page

        if (
            document.getElementById(
                "pdfFrame"
            )
        ) {

            loadPaperPage();

        }


        // Common Features

        initializeSearch();

        initializeSlider();

        initializeDarkMode();

        initializeMenu();

    }
);


// ======================================
// Global Error Handler
// ======================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "SLExam Pro Error:",
            event.error
        );

    }
);
