// ----------------------------
// Term Page
// ----------------------------
async function loadTermPage() {

    const title = document.getElementById("termTitle");
    const container = document.getElementById("paperContainer");

    if (!title || !container) return;

    title.textContent = `${subject} - Term ${term}`;

    container.innerHTML = "";

    const data = await loadData();
    const g = data.grades[grade];

    let papers = [];

    // Grade 12 / 13
    if (stream && g.streamSubjects) {

        papers =
            g.streamSubjects[stream][subject]?.[term] || [];

    }

    // Grade 1 - 11
    else {

        papers =
            g.subjects[subject]?.[term] || [];

    }

    if (papers.length === 0) {

        container.innerHTML =
            "<p style='text-align:center'>No Papers Available</p>";

        return;

    }

    papers.forEach((item, index) => {

        const card = createCard(

            item.title,

            `paper.html?grade=${grade}&stream=${encodeURIComponent(stream || "")}&subject=${encodeURIComponent(subject)}&term=${term}&paper=${index}`

        );

        container.appendChild(card);

    });

}
