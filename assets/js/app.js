// ======================================
// SLExam Pro v3.0
// app.js - Part 1
// ======================================

// URL Parameters
const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const stream = params.get("stream");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");

// Database
let paperData = null;

// -----------------------------
// Load Database
// -----------------------------
async function loadData() {

    if (paperData) return paperData;

    const response = await fetch("assets/data/papers.json");

    if (!response.ok) {

        throw new Error("Cannot load papers.json");

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
// Create Empty Message
// -----------------------------
function showEmpty(container, message){

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
// Safe Encode
// -----------------------------
function url(value){

    return encodeURIComponent(value);

}
// ======================================
// app.js - Part 2
// Grade + Stream + Subject
// ======================================

// -----------------------------
// Grade Page
// -----------------------------
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

    // Grade 12 / 13

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

    title.textContent =

        `Grade ${grade} - ${stream}`;

    container.innerHTML = "";

    const subjects =

        g.streamSubjects[stream];

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

    const title =

        document.getElementById("subjectTitle");

    if (!title) return;

    title.textContent = subject;

    document.getElementById("term1").href =

        `term.html?grade=${grade}&stream=${url(stream || "")}&subject=${url(subject)}&term=1`;

    document.getElementById("term2").href =

        `term.html?grade=${grade}&stream=${url(stream || "")}&subject=${url(subject)}&term=2`;

    document.getElementById("term3").href =

        `term.html?grade=${grade}&stream=${url(stream || "")}&subject=${url(subject)}&term=3`;

}
// ======================================
// app.js - Part 3
// Term Page + Paper List
// ======================================

// -----------------------------
// Term Page
// -----------------------------
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

    // தற்போது Demo Paper List
    // பின்னர் papers.json-ல் PDF சேர்க்கும்போது இதை Dynamic ஆக்கலாம்

    for (let i = 1; i <= 5; i++) {

        container.appendChild(

            createCard(

                `Paper ${i}`,

                `paper.html?grade=${grade}&stream=${url(stream || "")}&subject=${url(subject)}&term=${term}&paper=${i}`

            )

        );

    }

}


// -----------------------------
// Paper Page
// -----------------------------
function loadPaperPage() {

    const frame = document.getElementById("pdfFrame");
    const download = document.getElementById("downloadBtn");
    const title = document.getElementById("paperTitle");

    if (!frame || !download) return;

    title.textContent =
        `${subject} - Paper ${paper}`;

    // Demo PDF
    // பின்னர் papers.json-லிருந்து PDF path எடுப்போம்

    const pdfPath = "assets/pdf/sample.pdf";

    frame.src = pdfPath;

    download.href = pdfPath;

}
// ======================================
// app.js - Part 4
// Initialize Pages
// ======================================

// -----------------------------
// Safe Run
// -----------------------------
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

});


// -----------------------------
// Global Error Handler
// -----------------------------
window.addEventListener("error", (e) => {

    console.error("SLExam Pro Error :", e.error);

});
