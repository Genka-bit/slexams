// ======================================
// SLExam Pro v4.0
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

// Load papers.json
async function loadData() {

    if (paperData) return paperData;

    const response = await fetch("assets/data/papers.json");

    if (!response.ok) {
        throw new Error("Cannot load papers.json");
    }

    paperData = await response.json();

    return paperData;
}

// Create Card
function createCard(title, link) {

    const a = document.createElement("a");

    a.className = "grade-card";
    a.href = link;
    a.textContent = title;

    return a;
}

// Empty Message
function showEmpty(container, message) {

    container.innerHTML = `
        <div style="
            width:100%;
            text-align:center;
            padding:40px;
            font-size:18px;
            color:#666;">
            ${message}
        </div>
    `;
}

// URL Encode
function url(value) {
    return encodeURIComponent(value || "");
}
// ======================================
// Part 2 - Grade Page
// ======================================

async function loadGradePage() {

    const title = document.getElementById("gradeTitle");
    const container = document.getElementById("subjectContainer");

    if (!title || !container) return;

    const data = await loadData();

    const g = data.grades[grade];

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
    Object.keys(g.subjects).forEach(subjectName => {

        container.appendChild(

            createCard(

                subjectName,

                `subject.html?grade=${grade}&subject=${url(subjectName)}`

            )

        );

    });

}
// ======================================
// Part 3 - Stream Page + Subject Page
// ======================================

// -----------------------------
// Stream Page
// -----------------------------
async function loadStreamPage() {

    const title = document.getElementById("streamGradeTitle");
    const container = document.getElementById("streamContainer");

    if (!title || !container) return;

    const data = await loadData();

    const g = data.grades[grade];

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

    subjects.forEach(subjectName => {

        container.appendChild(

            createCard(

                subjectName,

                `subject.html?grade=${grade}&stream=${url(stream)}&subject=${url(subjectName)}`

            )

        );

    });

}

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
// ======================================
// Part 4 - Term Page
// ======================================

async function loadTermPage() {

    const title = document.getElementById("termTitle");
    const container = document.getElementById("paperContainer");

    if (!title || !container) return;

    title.textContent = `${subject} - Term ${term}`;

    container.innerHTML = "";

    const data = await loadData();

    const g = data.grades[grade];

    if (!g) {

        showEmpty(container, "Grade Not Found");

        return;

    }

    let papers = [];

    // Grade 1 - 11
    if (g.subjects) {

        papers = g.subjects?.[subject]?.[term] || [];

    }

    // Grade 12 - 13
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
// Part 5 - Paper Page (PDF Viewer)
// ======================================

async function loadPaperPage() {

    const frame = document.getElementById("pdfFrame");
    const download = document.getElementById("downloadBtn");
    const title = document.getElementById("paperTitle");

    if (!frame || !download || !title) return;

    const data = await loadData();

    const g = data.grades[grade];

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

    const paperIndex = Number(paper);

    if (
        Number.isNaN(paperIndex) ||
        !papers[paperIndex]
    ) {

        title.textContent = "Paper Not Found";

        return;

    }

    const selectedPaper = papers[paperIndex];

    title.textContent = selectedPaper.title;

    frame.src = selectedPaper.pdf;

    download.href = selectedPaper.pdf;

    download.setAttribute(
        "download",
        selectedPaper.title + ".pdf"
    );

}
// ======================================
// Part 6 - Initialize Pages + Error Handler
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


    // Paper PDF Page
    if (document.getElementById("pdfFrame")) {

        loadPaperPage();

    }

});


// Global Error Handler
window.addEventListener("error", (event) => {

    console.error(
        "SLExam Pro Error:",
        event.error
    );

});
// ===========================
// Search
// ===========================

function initializeSearch(){

    const input = document.getElementById("searchInput");
    const button = document.getElementById("searchBtn");

    if(!input || !button) return;

    button.addEventListener("click",()=>{

        const value = input.value.trim().toLowerCase();

        if(value==="") return;

        const match = value.match(/\d+/);

        if(match){

            const grade = parseInt(match[0]);

            if(grade>=1 && grade<=13){

                window.location.href =
                `grade.html?grade=${grade}`;

                return;

            }

        }

        alert("Please enter a valid grade (Example: Grade 6)");

    });

}
