// =========================
// SLExam Pro
// Dynamic Loader
// =========================

const params = new URLSearchParams(location.search);

const grade = params.get("grade");

async function loadSubjects(){

    const response = await fetch("assets/data/papers.json");

    const data = await response.json();

    const gradeData = data.grades[grade];

    document.getElementById("gradeTitle").innerText =
        "Grade " + grade;

    const container =
        document.getElementById("subjectContainer");

    container.innerHTML = "";

    // Grade 12 & 13
    if(gradeData.streams){

        gradeData.streams.forEach(stream=>{

            container.innerHTML += `
            <a class="grade-card"
            href="stream.html?grade=${grade}&stream=${stream}">
            ${stream}
            </a>`;

        });

        return;

    }

    // Grade 1-11
    gradeData.subjects.forEach(subject=>{

        container.innerHTML += `
        <a class="grade-card"
        href="subject.html?grade=${grade}&subject=${encodeURIComponent(subject)}">
        ${subject}
        </a>`;

    });

}

if(document.getElementById("subjectContainer")){

    loadSubjects();

}
