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
// Part 7 - Universal Search
// ======================================

async function initializeSearch() {

    const input =
        document.getElementById("searchInput");

    const button =
        document.getElementById("searchBtn");

    if (!input || !button) {
        return;
    }

    // ==================================
    // CREATE SEARCH RESULT BOX
    // ==================================

    let resultBox =
        document.getElementById("searchResults");

    if (!resultBox) {

        resultBox =
            document.createElement("div");

        resultBox.id =
            "searchResults";

        resultBox.className =
            "search-results";

        const searchBox =
            document.querySelector(".search-box");

        if (searchBox) {
            searchBox.after(resultBox);
        }

    }


    // ==================================
    // SEARCH FUNCTION
    // ==================================

    async function performSearch() {

        const value =
            input.value
                .trim()
                .toLowerCase();

        if (!value) {

            resultBox.innerHTML = "";

            resultBox.style.display =
                "none";

            return;

        }


        resultBox.style.display =
            "block";

        resultBox.innerHTML =
            "<p>🔎 Searching...</p>";


        const results = [];


        // ==================================
        // GRADE SEARCH
        // ==================================

        const gradeMatch =
            value.match(/grade\s*(\d+)/i);

        if (gradeMatch) {

            const searchedGrade =
                Number.parseInt(
                    gradeMatch[1],
                    10
                );

            if (
                searchedGrade >= 1 &&
                searchedGrade <= 13
            ) {

                results.push({

                    type: "📚 Grade",

                    title:
                        `Grade ${searchedGrade}`,

                    link:
                        `grade.html?grade=${searchedGrade}`

                });

            }

        }


        // ==================================
        // SUBJECT / PAPER SEARCH
        // ==================================

        for (
            let g = 1;
            g <= 13;
            g++
        ) {

            try {

                const response =
                    await fetch(
                        `assets/data/grade${g}.json`
                    );

                if (!response.ok) {
                    continue;
                }

                const data =
                    await response.json();


                // ==================================
                // GRADE 1 - 11
                // ==================================

                if (data.subjects) {

                    for (
                        const subjectName
                        of Object.keys(
                            data.subjects
                        )
                    ) {

                        const subjectLower =
                            subjectName
                                .toLowerCase();


                        // Subject match

                        if (
                            subjectLower
                                .includes(value)
                        ) {

                            results.push({

                                type: "📚 Subject",

                                title:
                                    `Grade ${g} - ${subjectName}`,

                                link:
                                    `subject.html?grade=${g}&subject=${encodeURIComponent(subjectName)}`

                            });

                        }


                        // Papers

                        const terms =
                            data.subjects[
                                subjectName
                            ];


                        if (
                            !terms ||
                            typeof terms !==
                            "object"
                        ) {
                            continue;
                        }


                        for (
                            const termName
                            of Object.keys(terms)
                        ) {

                            const papers =
                                terms[termName];


                            if (
                                !Array.isArray(
                                    papers
                                )
                            ) {
                                continue;
                            }


                            papers.forEach(
                                (item, index) => {

                                    if (
                                        !item ||
                                        !item.title
                                    ) {
                                        return;
                                    }


                                    const paperTitle =
                                        item.title
                                            .toLowerCase();


                                    if (
                                        paperTitle
                                            .includes(value)
                                    ) {

                                        const termNumber =
                                            termName
                                                .match(/\d+/)
                                                ?. [0] ||
                                            termName;


                                        results.push({

                                            type:
                                                "📄 Paper",

                                            title:
                                                `Grade ${g} - ${item.title}`,

                                            link:
                                                `paper.html?grade=${g}&subject=${encodeURIComponent(subjectName)}&term=${termNumber}&paper=${index}`

                                        });

                                    }

                                }
                            );

                        }

                    }

                }


                // ==================================
                // GRADE 12 - 13 STREAMS
                // ==================================

                if (
                    data.streamSubjects
                ) {

                    for (
                        const streamName
                        of Object.keys(
                            data.streamSubjects
                        )
                    ) {

                        const subjects =
                            data.streamSubjects[
                                streamName
                            ];


                        if (
                            !subjects ||
                            typeof subjects !==
                            "object"
                        ) {
                            continue;
                        }


                        for (
                            const subjectName
                            of Object.keys(
                                subjects
                            )
                        ) {

                            if (
                                subjectName
                                    .toLowerCase()
                                    .includes(value)
                            ) {

                                results.push({

                                    type:
                                        "📚 Subject",

                                    title:
                                        `Grade ${g} - ${streamName} - ${subjectName}`,

                                    link:
                                        `subject.html?grade=${g}&stream=${encodeURIComponent(streamName)}&subject=${encodeURIComponent(subjectName)}`

                                });

                            }

                        }

                    }

                }

            }

            catch (error) {

                console.error(
                    `Search Grade ${g} Error:`,
                    error
                );

            }

        }


        // ==================================
        // NEWS
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/news.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const news =
                    Array.isArray(data.news)
                        ? data.news
                        : [];


                news.forEach(item => {

                    if (!item) {
                        return;
                    }

                    const title =
                        String(
                            item.title || ""
                        );


                    if (
                        title
                            .toLowerCase()
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📰 News",

                            title:
                                title,

                            link:
                                "news.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "News Search Error:",
                error
            );

        }


        // ==================================
        // SCHEMES
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/schemes.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const schemes =
                    Array.isArray(
                        data.schemes
                    )
                        ? data.schemes
                        : [];


                schemes.forEach(item => {

                    if (!item) {
                        return;
                    }


                    const searchText =
                        (
                            item.title ||
                            ""
                        ).toLowerCase();


                    if (
                        searchText
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📚 Scheme",

                            title:
                                item.title,

                            link:
                                "scheme.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "Scheme Search Error:",
                error
            );

        }


        // ==================================
        // EDUCATIONAL APPS
        // ==================================

        try {

            const response =
                await fetch(
                    `assets/data/apps.json?v=${Date.now()}`
                );

            if (response.ok) {

                const data =
                    await response.json();

                const apps =
                    Array.isArray(data.apps)
                        ? data.apps
                        : [];


                apps.forEach(item => {

                    if (!item) {
                        return;
                    }


                    const searchText =
                        (
                            item.name ||
                            ""
                        ).toLowerCase();


                    if (
                        searchText
                            .includes(value)
                    ) {

                        results.push({

                            type:
                                "📱 App",

                            title:
                                item.name,

                            link:
                                "apps.html"

                        });

                    }

                });

            }

        }

        catch (error) {

            console.error(
                "App Search Error:",
                error
            );

        }


        // ==================================
        // REMOVE DUPLICATES
        // ==================================

        const uniqueResults = [];

        const usedLinks =
            new Set();


        results.forEach(item => {

            if (
                !item ||
                !item.link
            ) {
                return;
            }


            const key =
                item.type +
                "|" +
                item.title +
                "|" +
                item.link;


            if (
                usedLinks.has(key)
            ) {
                return;
            }


            usedLinks.add(key);

            uniqueResults.push(item);

        });


        // ==================================
        // NO RESULTS
        // ==================================

        if (
            uniqueResults.length === 0
        ) {

            resultBox.innerHTML = `

                <div class="search-no-result">

                    🔍 No matching results found.

                </div>

            `;

            return;

        }


        // ==================================
        // SHOW RESULTS
        // ==================================

        resultBox.innerHTML =
            uniqueResults
                .slice(0, 30)
                .map(item => `

                    <a
                        href="${item.link}"
                        class="search-result-item"
                    >

                        <span class="search-result-type">
                            ${item.type}
                        </span>

                        <span class="search-result-title">
                            ${escapeSearchHTML(
                                item.title
                            )}
                        </span>

                    </a>

                `)
                .join("");

    }


    // ==================================
    // ENTER KEY
    // ==================================

    input.addEventListener(
        "keypress",
        event => {

            if (
                event.key === "Enter"
            ) {

                performSearch();

            }

        }
    );


    // ==================================
    // SEARCH BUTTON
    // ==================================

    button.addEventListener(
        "click",
        performSearch
    );

}


// ======================================
// SEARCH HTML ESCAPE
// ======================================

function escapeSearchHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

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
// Part 10.5 - Home Recent Updates
// ======================================

async function loadHomeRecentUpdates() {

    // Home page மட்டும்
    if (
        !document.getElementById("recentPapers") &&
        !document.getElementById("recentNews") &&
        !document.getElementById("recentSchemes") &&
        !document.getElementById("recentApps")
    ) {
        return;
    }


    // ==================================
    // RECENT PAPERS
    // ==================================

    await loadRecentPapers();


    // ==================================
    // RECENT NEWS
    // ==================================

    await loadRecentNews();


    // ==================================
    // RECENT SCHEMES
    // ==================================

    await loadRecentSchemes();


    // ==================================
    // RECENT APPS
    // ==================================

    await loadRecentApps();

}



// ======================================
// RECENT PAPERS
// ======================================

async function loadRecentPapers() {

    const container =
        document.getElementById("recentPapers");

    if (!container) return;


    const papers = [];


    // Grade 1 - 13
    for (
        let g = 1;
        g <= 13;
        g++
    ) {

        try {

            const response =
                await fetch(
                    `assets/data/grade${g}.json?v=${Date.now()}`
                );


            if (!response.ok) {
                continue;
            }


            const data =
                await response.json();


            // ==================================
            // Grade 1 - 11
            // ==================================

            if (data.subjects) {

                Object.keys(
                    data.subjects
                ).forEach(subjectName => {

                    const terms =
                        data.subjects[
                            subjectName
                        ];


                    if (
                        !terms ||
                        typeof terms !==
                        "object"
                    ) {
                        return;
                    }


                    Object.keys(
                        terms
                    ).forEach(termName => {

                        const termPapers =
                            terms[termName];


                        if (
                            !Array.isArray(
                                termPapers
                            )
                        ) {
                            return;
                        }


                        termPapers.forEach(
                            (item, index) => {

                                if (
                                    !item ||
                                    !item.title
                                ) {
                                    return;
                                }


                                papers.push({

                                    grade:
                                        g,

                                    subject:
                                        subjectName,

                                    term:
                                        termName,

                                    title:
                                        item.title,

                                    pdf:
                                        item.pdf,

                                    index:
                                        index

                                });

                            }
                        );

                    });

                });

            }


            // ==================================
            // Grade 12 - 13
            // ==================================

            if (data.streamSubjects) {

                Object.keys(
                    data.streamSubjects
                ).forEach(streamName => {

                    const streamSubjects =
                        data.streamSubjects[
                            streamName
                        ];


                    if (
                        !streamSubjects ||
                        typeof streamSubjects !==
                        "object"
                    ) {
                        return;
                    }


                    Object.keys(
                        streamSubjects
                    ).forEach(subjectName => {

                        const terms =
                            streamSubjects[
                                subjectName
                            ];


                        if (
                            !terms ||
                            typeof terms !==
                            "object"
                        ) {
                            return;
                        }


                        Object.keys(
                            terms
                        ).forEach(termName => {

                            const termPapers =
                                terms[
                                    termName
                                ];


                            if (
                                !Array.isArray(
                                    termPapers
                                )
                            ) {
                                return;
                            }


                            termPapers.forEach(
                                (item, index) => {

                                    if (
                                        !item ||
                                        !item.title
                                    ) {
                                        return;
                                    }


                                    papers.push({

                                        grade:
                                            g,

                                        stream:
                                            streamName,

                                        subject:
                                            subjectName,

                                        term:
                                            termName,

                                        title:
                                            item.title,

                                        pdf:
                                            item.pdf,

                                        index:
                                            index

                                    });

                                }
                            );

                        });

                    });

                });

            }

        }

        catch (error) {

            console.error(
                `Recent Papers Grade ${g}:`,
                error
            );

        }

    }


    // ==================================
    // SHOW LAST 3
    // ==================================

    const recent =
        papers.slice(-3).reverse();


    if (
        recent.length === 0
    ) {

        container.innerHTML = `

            <div class="recent-item">

                <div class="recent-item-left">

                    <div class="recent-icon">
                        📄
                    </div>

                    <div>

                        <div class="recent-title">
                            No papers available
                        </div>

                    </div>

                </div>

            </div>

        `;

        return;
    }


    container.innerHTML =
        recent.map(item => {

            const streamPart =
                item.stream
                    ? `&stream=${encodeURIComponent(item.stream)}`
                    : "";


            const termNumber =
                String(item.term)
                    .match(/\d+/)
                    ?. [0] ||
                item.term;


            const link =
                `paper.html?grade=${item.grade}${streamPart}&subject=${encodeURIComponent(item.subject)}&term=${termNumber}&paper=${item.index}`;


            return `

                <a
                    href="${link}"
                    class="recent-item"
                >

                    <div class="recent-item-left">

                        <div class="recent-icon">
                            📄
                        </div>

                        <div>

                            <div class="recent-title">
                                Grade ${item.grade} - ${escapeRecentHTML(item.subject)}
                            </div>

                            <div class="recent-meta">
                                ${escapeRecentHTML(item.term)}
                                -
                                ${escapeRecentHTML(item.title)}
                            </div>

                        </div>

                    </div>

                    <div class="recent-arrow">
                        →
                    </div>

                </a>

            `;

        }).join("");

}



// ======================================
// RECENT NEWS
// ======================================

async function loadRecentNews() {

    const container =
        document.getElementById("recentNews");

    if (!container) return;


    try {

        const response =
            await fetch(
                `assets/data/news.json?v=${Date.now()}`
            );


        if (!response.ok) {
            throw new Error(
                "News JSON unavailable"
            );
        }


        const data =
            await response.json();


        const news =
            Array.isArray(data.news)
                ? data.news
                : [];


        const recent =
            news.slice(0, 3);


        if (
            recent.length === 0
        ) {

            container.innerHTML =
                `<div class="recent-small">
                    No recent news available.
                </div>`;

            return;

        }


        container.innerHTML =
            recent.map(item => `

                <div class="recent-small">

                    📰
                    ${escapeRecentHTML(
                        item.title || "Education News"
                    )}

                </div>

            `).join("");

    }

    catch (error) {

        console.error(
            "Recent News Error:",
            error
        );

    }

}



// ======================================
// RECENT SCHEMES
// ======================================

async function loadRecentSchemes() {

    const container =
        document.getElementById("recentSchemes");

    if (!container) return;


    try {

        const response =
            await fetch(
                `assets/data/schemes.json?v=${Date.now()}`
            );


        if (!response.ok) {
            throw new Error(
                "Schemes JSON unavailable"
            );
        }


        const data =
            await response.json();


        const schemes =
            Array.isArray(
                data.schemes
            )
                ? data.schemes
                : [];


        const recent =
            schemes.slice(0, 3);


        if (
            recent.length === 0
        ) {

            container.innerHTML =
                `<div class="recent-small">
                    No recent schemes available.
                </div>`;

            return;

        }


        container.innerHTML =
            recent.map(item => `

                <div class="recent-small">

                    📚
                    ${escapeRecentHTML(
                        item.title ||
                        "Marking Scheme"
                    )}

                </div>

            `).join("");

    }

    catch (error) {

        console.error(
            "Recent Schemes Error:",
            error
        );

    }

}



// ======================================
// RECENT APPS
// ======================================

async function loadRecentApps() {

    const container =
        document.getElementById("recentApps");

    if (!container) return;


    try {

        const response =
            await fetch(
                `assets/data/apps.json?v=${Date.now()}`
            );


        if (!response.ok) {
            throw new Error(
                "Apps JSON unavailable"
            );
        }


        const data =
            await response.json();


        const apps =
            Array.isArray(data.apps)
                ? data.apps
                : [];


        const recent =
            apps.slice(0, 3);


        if (
            recent.length === 0
        ) {

            container.innerHTML =
                `<div class="recent-small">
                    No recent apps available.
                </div>`;

            return;

        }


        container.innerHTML =
            recent.map(item => `

                <div class="recent-small">

                    📱
                    ${escapeRecentHTML(
                        item.name ||
                        "Educational App"
                    )}

                </div>

            `).join("");

    }

    catch (error) {

        console.error(
            "Recent Apps Error:",
            error
        );

    }

}



// ======================================
// HTML ESCAPE
// ======================================

function escapeRecentHTML(value) {

    return String(value || "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
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
        loadHomeRecentUpdates();

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
