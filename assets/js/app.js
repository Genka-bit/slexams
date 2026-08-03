// ======================================
// SLExam Pro v2.0
// app.js - Part 1
// ======================================

const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const stream = params.get("stream");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");

let paperData = null;

// ----------------------------
// Load papers.json
// ----------------------------
async function loadData() {

    if (paperData) return paperData;

    const response = await fetch("assets/data/papers.json");

    paperData = await response.json();

    return paperData;

}

// ----------------------------
// Create Card
// ----------------------------
function createCard(text, link) {

    const a = document.createElement("a");

    a.className = "grade-card";

    a.href = link;

    a.textContent = text;

    return a;

}

// ----------------------------
// Grade Page
// ----------------------------
async function loadGradePage() {

    const data = await loadData();

    const title =
        document.getElementById("gradeTitle");

    const container =
        document.getElementById("subjectContainer");

    if (!title || !container) return;

    title.textContent = "Grade " + grade;

    container.innerHTML = "";

    const g = data.grades[grade];

    if (!g) {

        container.innerHTML =
        "<p>Grade Not Found</p>";

        return;

    }

    // Grade 12 / 13

    if (g.streams) {

        g.streams.forEach(streamName => {

            container.appendChild(

                createCard(

                    streamName,

                    `stream.html?grade=${grade}&stream=${encodeURIComponent(streamName)}`

                )

            );

        });

        return;

    }

    // Grade 1 - 11

    g.subjects.forEach(subjectName => {

        container.appendChild(

            createCard(

                subjectName,

                `subject.html?grade=${grade}&subject=${encodeURIComponent(subjectName)}`

            )

        );

    });

}

// Run Pages Correctly

if(document.getElementById("subjectContainer")){
    loadGradePage();
}

if(document.getElementById("streamContainer")){
    loadStreamPage();
}

if(document.getElementById("subjectTitle")){
    loadSubjectPage();
}

if(document.getElementById("paperContainer")){
    loadTermPage();
}

if(document.getElementById("pdfFrame")){
    loadPaperPage();
}

// ======================================
// app.js - Part 2
// Stream Page + Subject Page
// ======================================

// ----------------------------
// Stream Page
// ----------------------------
async function loadStreamPage() {

    const title = document.getElementById("streamGradeTitle");
    const container = document.getElementById("streamContainer");

    if (!title || !container) return;

    const data = await loadData();

    const g = data.grades[grade];

    if (!g || !g.streamSubjects) {

        container.innerHTML = "<p>No Streams Found</p>";
        return;
    }

    title.textContent = `Grade ${grade} - ${stream}`;

    container.innerHTML = "";

    const subjects = g.streamSubjects[stream];

    if (!subjects) {

        container.innerHTML = "<p>No Subjects Found</p>";
        return;

    }

    subjects.forEach(subjectName => {

        container.appendChild(

            createCard(

                subjectName,

                `subject.html?grade=${grade}&stream=${encodeURIComponent(stream)}&subject=${encodeURIComponent(subjectName)}`

            )

        );

    });

}

// ----------------------------
// Subject Page
// ----------------------------
function loadSubjectPage() {

    const title = document.getElementById("subjectTitle");

    if (!title) return;

    title.textContent = subject;

    document.getElementById("term1").href =
        `term.html?grade=${grade}&stream=${encodeURIComponent(stream || "")}&subject=${encodeURIComponent(subject)}&term=1`;

    document.getElementById("term2").href =
        `term.html?grade=${grade}&stream=${encodeURIComponent(stream || "")}&subject=${encodeURIComponent(subject)}&term=2`;

    document.getElementById("term3").href =
        `term.html?grade=${grade}&stream=${encodeURIComponent(stream || "")}&subject=${encodeURIComponent(subject)}&term=3`;

}

// ----------------------------
// Run Pages
// ----------------------------
loadStreamPage();
loadSubjectPage();

// ======================================
// app.js - Part 3
// Term Page + Paper Page + PDF Viewer
// ======================================

// ----------------------------
// Term Page
// ----------------------------
async function loadTermPage() {

    const title = document.getElementById("termTitle");
    const container = document.getElementById("paperContainer");

    if (!title || !container) return;

    title.textContent = `${subject} - Term ${term}`;

    container.innerHTML = "";

    // தற்போது Demo Papers
    // பின்னர் papers.json-இலிருந்து Load செய்வோம்

    for (let i = 1; i <= 5; i++) {

        const card = createCard(
            "Paper " + i,
            `paper.html?grade=${grade}&stream=${encodeURIComponent(stream || "")}&subject=${encodeURIComponent(subject)}&term=${term}&paper=paper${i}`
        );

        container.appendChild(card);

    }

}

// ----------------------------
// PDF Viewer
// ----------------------------
function loadPaperPage() {

    const frame = document.getElementById("pdfFrame");
    const download = document.getElementById("downloadBtn");

    if (!frame || !download) return;

    // Demo PDF
    // பின்னர் papers.json-இலிருந்து PDF பாதையை எடுப்போம்

    const pdfPath = "assets/pdf/sample.pdf";

    frame.src = pdfPath;

    download.href = pdfPath;

}

// ----------------------------
// Coming Soon
// ----------------------------
function showComingSoon(message) {

    document.body.innerHTML = `
    <div style="
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        font-family:Arial;
        text-align:center;
        flex-direction:column;
    ">
        <h1>Coming Soon</h1>
        <p>${message}</p>
    </div>
    `;

}

// ----------------------------
// Run
// ----------------------------
loadTermPage();
loadPaperPage();
