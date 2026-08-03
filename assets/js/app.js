// ===============================
// SLExam Pro - app.js
// ===============================

// URL Parameters
const params = new URLSearchParams(window.location.search);

const grade = params.get("grade");
const subject = params.get("subject");
const term = params.get("term");
const paper = params.get("paper");

// ---------- grade.html ----------
if (document.getElementById("gradeTitle")) {

    document.getElementById("gradeTitle").textContent =
        "Grade " + grade;

    const container = document.getElementById("subjectContainer");

    const demoSubjects = [
        "Tamil",
        "Mathematics",
        "English",
        "Science",
        "History",
        "Geography",
        "ICT"
    ];

    demoSubjects.forEach(sub => {

        const a = document.createElement("a");

        a.className = "grade-card";

        a.href =
        `subject.html?grade=${grade}&subject=${encodeURIComponent(sub)}`;

        a.textContent = sub;

        container.appendChild(a);

    });

}

// ---------- subject.html ----------
if (document.getElementById("subjectTitle")) {

    document.getElementById("subjectTitle").textContent = subject;

    document.getElementById("term1").href =
    `term.html?grade=${grade}&subject=${subject}&term=1`;

    document.getElementById("term2").href =
    `term.html?grade=${grade}&subject=${subject}&term=2`;

    document.getElementById("term3").href =
    `term.html?grade=${grade}&subject=${subject}&term=3`;

}

// ---------- term.html ----------
if (document.getElementById("paperContainer")) {

    document.getElementById("termTitle").textContent =
    `${subject} - Term ${term}`;

    const papers = [
        "Paper 1",
        "Paper 2",
        "Paper 3",
        "Paper 4",
        "Paper 5"
    ];

    const container = document.getElementById("paperContainer");

    papers.forEach((p, i) => {

        const a = document.createElement("a");

        a.className = "grade-card";

        a.href =
        `paper.html?paper=assets/pdf/sample.pdf`;

        a.textContent = p;

        container.appendChild(a);

    });

}

// ---------- paper.html ----------
if (document.getElementById("pdfFrame")) {

    const pdf = params.get("paper");

    document.getElementById("pdfFrame").src = pdf;

    document.getElementById("downloadBtn").href = pdf;

}
